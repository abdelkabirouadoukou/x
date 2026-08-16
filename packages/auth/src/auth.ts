import { createHmac, timingSafeEqual } from "node:crypto";
import { checkCsrf } from "@thexjs/core";
import type { MiddlewareFn } from "@thexjs/core";
import { readCookie } from "./cookies";
import {
  buildAuthorizationUrl,
  type CredentialsProvider,
  exchangeCode,
  fetchUserInfo,
  type OAuth2ProviderConfig,
  type Provider,
  type ResolvedProvider,
  toOAuth2,
} from "./providers";
import {
  type GuardMiddlewareOptions,
  requireAuth as requireAuthGuard,
  requirePermission as requirePermissionGuard,
  requireRole as requireRoleGuard,
  type SessionGuard,
  toMiddleware,
} from "./rbac";
import type { SessionStore } from "./session";
import type { AuthUser, Session } from "./types";

export const SESSION_COOKIE = "x_session";
export const OAUTH_STATE_COOKIE = "x_oauth_state";

const OAUTH_STATE_MAX_AGE = 300; // seconds

export interface AuthConfig {
  /** Providers registered on the auth handler (at least one). */
  providers: Provider[];
  /**
   * Session store. Pass `createSQLiteSessionStore()` / `createPostgresSessionStore()`.
   */
  store: SessionStore;
  /**
   * A secret used to HMAC session tokens at rest and OAuth state challenges.
   * In production this must be a stable value; if omitted, a random dev
   * secret is generated and a warning is printed.
   */
  secret?: string;
  /** Session lifetime in seconds. Default: 7 days. */
  sessionMaxAge?: number;
  /** Where to redirect the browser after a successful sign-in. Default: `/`. */
  successRedirect?: string;
  /** Where to redirect the browser after sign-out. Default: `/`. */
  signOutRedirect?: string;
  /**
   * Resolves the roles/permissions granted to a user at session creation.
   * The result is snapshotted into the session's `user` object, so RBAC
   * guards (`auth.requireRole`, `auth.requirePermission`) read it without a
   * per-request lookup. When omitted, roles come from the provider's
   * `authorize`/`profile` result (its `roles`/`permissions` fields).
   */
  resolveRoles?: (user: AuthUser) => Promise<Partial<Pick<AuthUser, "roles" | "permissions">>>;
}

export interface ResolvedAuthConfig {
  providers: Provider[];
  store: SessionStore;
  secret: string;
  sessionMaxAge: number;
  successRedirect: string;
  signOutRedirect: string;
}

/** Additional runtime context for `handleRequest`. */
export interface HandleRequestOptions {
  /** The app's base URL, used to build OAuth redirect URIs. Default: `http://localhost:${port}`. */
  baseUrl?: string;
}

export interface Auth {
  config: ResolvedAuthConfig;
  providers: Map<string, ResolvedProvider>;
  /**
   * Entry point for a catch-all route such as
   * `src/api/auth/[...auth].ts`. Routes the OAuth/credentials actions:
   *
   * - GET/POST `/api/auth/signin/<id>` — start a provider sign-in
   * - GET `/api/auth/callback/<id>` — OAuth callback
   * - POST `/api/auth/signout` — revoke the session (CSRF-protected)
   * - GET `/api/auth/session` — JSON `{ user }` or `401`
   */
  handleRequest(req: Request, options?: HandleRequestOptions): Promise<Response>;
  /** Reads the current session from a `Request`. Server-side helper. */
  getSession(req: Request): Promise<Session | null>;
  /** Creates a session for `user` and attaches the session cookie to `res`. */
  setSessionCookie(res: Response, user: AuthUser, provider: string): Promise<Response>;
  /** Clears the session cookie from `res` and revokes the session, if any. */
  clearSessionCookie(res: Response, req?: Request): Promise<Response>;
  /**
   * Route guard middleware: requires a signed-in session for the route.
   * Returns a core `MiddlewareFn` for `export const middleware` / `export const auth`.
   */
  requireAuth(options?: GuardMiddlewareOptions): MiddlewareFn;
  /**
   * Route guard middleware: requires the session's user to have any of the
   * given roles (a single role string or an array). Fail-closed: signed out →
   * 401, signed in but unauthorized → 403. Pass `redirectTo` to redirect
   * signed-out users instead of returning 401.
   */
  requireRole(roles: string | string[], options?: GuardMiddlewareOptions): MiddlewareFn;
  /**
   * Route guard middleware: requires the session's user to have every one of
   * the given permissions (a single string or an array). Fail-closed: signed
   * out → 401, signed in but unauthorized → 403. Pass `redirectTo` to
   * redirect signed-out users instead of returning 401.
   */
  requirePermission(permissions: string | string[], options?: GuardMiddlewareOptions): MiddlewareFn;
  /** Low-level guard combinator: `auth.guard(requireRole("admin"), { redirectTo: "/login" })`. */
  guard(guard: SessionGuard, options?: GuardMiddlewareOptions): MiddlewareFn;
}

/** Resolves `config` against defaults and returns the auth helper. */
export function defineAuth(config: AuthConfig): Auth {
  let secret = config.secret;
  if (!secret) {
    secret = Math.random().toString(36).slice(2) + Date.now().toString(36);
    console.warn(
      "[@thexjs/auth] No `secret` configured — generated an ephemeral one. " +
        "Set a stable `secret` in production so sessions survive restarts.",
    );
  }
  const resolved: ResolvedAuthConfig = {
    providers: config.providers,
    store: config.store,
    secret,
    sessionMaxAge: config.sessionMaxAge ?? 60 * 60 * 24 * 7,
    successRedirect: config.successRedirect ?? "/",
    signOutRedirect: config.signOutRedirect ?? "/",
  };

  const providers = new Map<string, ResolvedProvider>();
  for (const p of resolved.providers) {
    const normalized: ResolvedProvider = p.type === "oauth" ? toOAuth2(p) : p;
    if (providers.has(normalized.id)) {
      throw new Error(`[@thexjs/auth] Duplicate provider id "${normalized.id}"`);
    }
    providers.set(normalized.id, normalized);
  }
  if (providers.size === 0) {
    throw new Error("[@thexjs/auth] At least one provider must be configured");
  }

  const hash = (value: string): Promise<string> => {
    return Promise.resolve(createHmac("sha256", resolved.secret).update(value).digest("hex"));
  };

  // Timing-safe comparison of two hex digests, so an attacker probing the
  // session/state cookie can't distinguish byte-by-byte matches from `<`.
  const safeEqual = (expectedHex: string, actualHex: string): boolean => {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = Buffer.from(actualHex, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  };

  const createSessionToken = (): string => {
    return crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2);
  };

  const isSecure = (): boolean => process.env.NODE_ENV === "production";

  const cookieAttrs = (maxAge: number): string =>
    `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${isSecure() ? "; Secure" : ""}`;

  const sessionCookieHeader = (token: string): string =>
    `${SESSION_COOKIE}=${token}; ${cookieAttrs(resolved.sessionMaxAge)}`;

  const clearSessionCookieHeader = (): string => `${SESSION_COOKIE}=; ${cookieAttrs(0)}`;

  const withSetCookie = (res: Response, value: string): Response => {
    res.headers.append("Set-Cookie", value);
    return res;
  };

  const snapshotUser = async (user: AuthUser): Promise<AuthUser> => {
    const snapshot: AuthUser = { id: user.id };
    if (typeof user.name === "string") snapshot.name = user.name;
    if (typeof user.email === "string") snapshot.email = user.email;
    if (config.resolveRoles) {
      const granted = await config.resolveRoles(user);
      if (Array.isArray(granted.roles)) snapshot.roles = [...granted.roles];
      if (Array.isArray(granted.permissions)) snapshot.permissions = [...granted.permissions];
    } else {
      if (Array.isArray(user.roles)) snapshot.roles = [...user.roles];
      if (Array.isArray(user.permissions)) snapshot.permissions = [...user.permissions];
    }
    return snapshot;
  };

  const createSession = async (user: AuthUser, provider: string): Promise<string> => {
    const token = createSessionToken();
    const now = Date.now();
    const session: Session = {
      token: await hash(token),
      userId: user.id,
      provider,
      user: await snapshotUser(user),
      expiresAt: now + resolved.sessionMaxAge * 1000,
      createdAt: now,
    };
    await resolved.store.create(session);
    return token;
  };

  const establishSession = async (
    user: AuthUser,
    provider: string,
    extra?: HandleRequestOptions,
  ): Promise<Response> => {
    const token = await createSession(user, provider);
    const location = extra?.baseUrl
      ? new URL(resolved.successRedirect, extra.baseUrl).toString()
      : resolved.successRedirect;
    const res = new Response(null, { status: 302, headers: { Location: location } });
    return withSetCookie(res, sessionCookieHeader(token));
  };

  const notFound = (): Response => new Response("Not found", { status: 404 });
  const methodNotAllowed = (): Response => new Response("Method not allowed", { status: 405 });

  const handleOAuthSignIn = async (
    provider: OAuth2ProviderConfig,
    baseUrl: string,
  ): Promise<Response> => {
    const stateToken = createSessionToken();
    const state = await hash(stateToken);
    const res = new Response(null, {
      status: 302,
      headers: { Location: buildAuthorizationUrl(provider, baseUrl, state) },
    });
    return withSetCookie(
      res,
      `${OAUTH_STATE_COOKIE}=${stateToken}; ${cookieAttrs(OAUTH_STATE_MAX_AGE)}`,
    );
  };

  const handleOAuthCallback = async (
    provider: OAuth2ProviderConfig,
    req: Request,
    baseUrl: string,
  ): Promise<Response> => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return new Response("Missing code or state", { status: 400 });

    const stateToken = readCookie(req, OAUTH_STATE_COOKIE);
    if (!stateToken || !safeEqual(state, await hash(stateToken))) {
      return new Response("Invalid state", { status: 400 });
    }

    const tokens = await exchangeCode(provider, baseUrl, code);
    const userInfo = await fetchUserInfo(provider, tokens.access_token);
    const user = provider.profile(userInfo);
    if (!user?.id) return new Response("Provider returned no user", { status: 401 });
    return establishSession(user, provider.id, { baseUrl });
  };

  const handleCredentialsSignIn = async (
    provider: CredentialsProvider,
    req: Request,
  ): Promise<Response> => {
    if (req.method !== "POST") return methodNotAllowed();
    const csrf = checkCsrf(req);
    if (!csrf.ok) return new Response(`CSRF check failed: ${csrf.reason}`, { status: 403 });
    const form = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of form.entries()) params[key] = String(value);

    const user = await provider.authorize(params, { request: req });
    if (!user?.id) return new Response("Invalid credentials", { status: 401 });
    return establishSession(user, provider.id);
  };

  const handleSession = async (req: Request): Promise<Response> => {
    const session = await getSession(req);
    const body = JSON.stringify({ user: session ? session.user : null });
    return new Response(body, {
      status: session ? 200 : 401,
      headers: { "Content-Type": "application/json" },
    });
  };

  const handleSignOut = async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return methodNotAllowed();
    const csrf = checkCsrf(req);
    if (!csrf.ok) return new Response(`CSRF check failed: ${csrf.reason}`, { status: 403 });
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await resolved.store.revoke(await hash(token));
    const res = new Response(null, {
      status: 302,
      headers: { Location: resolved.signOutRedirect },
    });
    return withSetCookie(res, clearSessionCookieHeader());
  };

  const handleRequest = async (
    req: Request,
    options: HandleRequestOptions = {},
  ): Promise<Response> => {
    const url = new URL(req.url);
    const baseUrl = options.baseUrl ?? `http://localhost:${process.env.PORT ?? "3000"}`;
    const relative = url.pathname.replace(/^\/api\/auth\/?/, "");
    const [action, providerId, sub] = relative.split("/");
    const provider = providerId ? providers.get(providerId) : undefined;

    if (action === "signin" && provider) {
      if (provider.type === "credentials") {
        return handleCredentialsSignIn(provider, req);
      }
      return handleOAuthSignIn(provider, baseUrl);
    }
    if (action === "callback" && provider?.type === "oauth") {
      if (req.method !== "GET") return methodNotAllowed();
      return handleOAuthCallback(provider, req, baseUrl);
    }
    if (action === "signout" && !sub) return handleSignOut(req);
    if (action === "session" && !sub) return handleSession(req);
    return notFound();
  };

  const getSession = async (req: Request): Promise<Session | null> => {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return null;
    const hashed = await hash(token);
    let session: Session | null;
    try {
      session = await resolved.store.find(hashed);
    } catch (error) {
      // A session store outage (DB down / connection lost) fails closed:
      // treat the caller as signed out rather than crashing the request
      // handler with a 500 on every authenticated request.
      console.warn("[@thexjs/auth] session store lookup failed:", error);
      return null;
    }
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      await resolved.store.revoke(hashed);
      return null;
    }
    return session;
  };

  const setSessionCookie = async (
    res: Response,
    user: AuthUser,
    provider: string,
  ): Promise<Response> => {
    const token = await createSession(user, provider);
    return withSetCookie(res, sessionCookieHeader(token));
  };

  const clearSessionCookie = async (res: Response, req?: Request): Promise<Response> => {
    const token = req ? readCookie(req, SESSION_COOKIE) : null;
    if (token) await resolved.store.revoke(await hash(token));
    return withSetCookie(res, clearSessionCookieHeader());
  };

  return {
    config: resolved,
    providers,
    handleRequest,
    getSession,
    setSessionCookie,
    clearSessionCookie,
    requireAuth(options) {
      return toMiddleware(getSession, requireAuthGuard(), options);
    },
    requireRole(roles, options) {
      const list = Array.isArray(roles) ? roles : [roles];
      return toMiddleware(getSession, requireRoleGuard(...list), options);
    },
    requirePermission(permissions, options) {
      const list = Array.isArray(permissions) ? permissions : [permissions];
      return toMiddleware(getSession, requirePermissionGuard(...list), options);
    },
    guard(guard, options) {
      return toMiddleware(getSession, guard, options);
    },
  };
}
