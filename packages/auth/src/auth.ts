import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { MiddlewareFn } from "@thexjs/core";
import {
  auditLoginFailure,
  auditLoginSuccess,
  auditLogout,
  auditSessionRevoked,
  checkCsrf,
  clientIpFromRequest,
  requestIdFromRequest,
} from "@thexjs/core";
import { type BruteForceOptions, createBruteForceGuard } from "./brute-force";
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
export const OAUTH_PKCE_COOKIE = "x_oauth_pkce";

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
   * In production this must be a stable value; if omitted in production,
   * `defineAuth` throws rather than silently running with a per-process
   * ephemeral secret that invalidates every session on restart.
   */
  secret?: string;
  /**
   * Force the `Secure` flag on session/state cookies regardless of
   * `NODE_ENV`. Handy when developing against an HTTPS tunnel or behind a
   * TLS-terminating proxy. Default: `true` only in `NODE_ENV === "production"`.
   */
  forceSecureCookie?: boolean;
  /**
   * Per-account brute-force protection for the credentials provider. Two
   * independent buckets are checked together: an **account** bucket keyed by
   * the submitted identifier alone (so guessing one account from many IPs is
   * still throttled), and an **IP** bucket keyed by the client IP (so one IP
   * spraying many accounts is throttled while other clients — e.g. other users
   * behind the same NAT — remain unaffected, since each has its own IP). If the
   * identifier or client IP can't be determined, only the *other* axis is
   * enforced rather than folding everyone into one global bucket. In-memory
   * (single-process). Default: 5 failed attempts, 15-minute base window with
   * exponential backoff.
   */
  loginBruteForce?: BruteForceOptions;
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
   * Revokes every active session belonging to `userId`. Use this for
   * "log out everywhere", password changes, or compromised-account response:
   * the change takes effect on the next request of each affected session
   * because sessions are looked up per-request and no longer exist in the store.
   */
  revokeAllForUser(userId: string): Promise<void>;
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
  if (!config.secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "[@thexjs/auth] A stable `secret` must be configured in production. " +
        "Without one, sessions are HMAC'd with a random per-process secret and " +
        "every restart invalidates all sessions.",
    );
  }
  const secret = config.secret ?? randomBytes(32).toString("hex");
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

  // CSPRNG for session/state tokens: `randomUUID` is entropy-enough, but the
  // original `Math.random()` suffix was predictable. 32 bytes of CSPRNG hex
  // gives 256 bits of guessing resistance for the bearer session cookie.
  const createSessionToken = (): string => randomBytes(32).toString("hex");

  // PKCE: S256 challenge/verifier pair for the authorization-code flow.
  // The verifier never leaves the browser (stored only in the state cookie),
  // so an intercepted authorization code is useless without it.
  const createPkcePair = (): { verifier: string; challenge: string } => {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
  };

  const isSecure = (): boolean =>
    config.forceSecureCookie === true || process.env.NODE_ENV === "production";

  const bruteForce = createBruteForceGuard(config.loginBruteForce);

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

  const createSession = async (
    user: AuthUser,
    provider: string,
  ): Promise<{ token: string; sessionHash: string }> => {
    const token = createSessionToken();
    const now = Date.now();
    const sessionHash = await hash(token);
    const session: Session = {
      token: sessionHash,
      userId: user.id,
      provider,
      user: await snapshotUser(user),
      expiresAt: now + resolved.sessionMaxAge * 1000,
      createdAt: now,
    };
    await resolved.store.create(session);
    return { token, sessionHash };
  };

  const requestAuditContext = (
    req: Request | undefined,
  ): { ip: string | null; requestId?: string } => {
    if (!req) return { ip: null };
    const ip = clientIpFromRequest(req);
    const requestId = requestIdFromRequest(req);
    return { ip, ...(requestId !== undefined ? { requestId } : {}) };
  };

  const establishSession = async (
    user: AuthUser,
    provider: string,
    extra?: HandleRequestOptions,
    req?: Request,
  ): Promise<Response> => {
    const { token, sessionHash } = await createSession(user, provider);
    auditLoginSuccess({
      userId: user.id,
      provider,
      sessionHash,
      ...requestAuditContext(req),
    });
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
    const pkce = createPkcePair();
    const res = new Response(null, {
      status: 302,
      headers: { Location: buildAuthorizationUrl(provider, baseUrl, state, pkce.challenge) },
    });
    withSetCookie(res, `${OAUTH_STATE_COOKIE}=${stateToken}; ${cookieAttrs(OAUTH_STATE_MAX_AGE)}`);
    return withSetCookie(
      res,
      `${OAUTH_PKCE_COOKIE}=${pkce.verifier}; ${cookieAttrs(OAUTH_STATE_MAX_AGE)}`,
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
    if (!code || !state) {
      auditLoginFailure({
        userId: null,
        provider: provider.id,
        ...requestAuditContext(req),
        reason: "missing code or state",
      });
      return new Response("Missing code or state", { status: 400 });
    }

    const stateToken = readCookie(req, OAUTH_STATE_COOKIE);
    if (!stateToken || !safeEqual(state, await hash(stateToken))) {
      auditLoginFailure({
        userId: null,
        provider: provider.id,
        ...requestAuditContext(req),
        reason: "invalid state",
      });
      return new Response("Invalid state", { status: 400 });
    }

    // PKCE: the verifier lives in its own cookie from the sign-in step. If it
    // is missing (no sign-in happened, or the cookie was dropped), fail closed
    // rather than exchanging the code without the proof-of-possession.
    const pkceVerifier = readCookie(req, OAUTH_PKCE_COOKIE);
    if (!pkceVerifier) {
      auditLoginFailure({
        userId: null,
        provider: provider.id,
        ...requestAuditContext(req),
        reason: "missing PKCE verifier",
      });
      return new Response("Missing PKCE verifier", { status: 400 });
    }

    let user: ReturnType<typeof provider.profile> | null;
    try {
      const tokens = await exchangeCode(provider, baseUrl, code, pkceVerifier);
      const userInfo = await fetchUserInfo(provider, tokens.access_token);
      user = provider.profile(userInfo);
    } catch (error) {
      auditLoginFailure({
        userId: null,
        provider: provider.id,
        ...requestAuditContext(req),
        reason: error instanceof Error ? error.message : "OAuth exchange failed",
      });
      return new Response("OAuth exchange failed", { status: 502 });
    }
    if (!user?.id) {
      auditLoginFailure({
        userId: null,
        provider: provider.id,
        ...requestAuditContext(req),
        reason: "provider returned no user",
      });
      return new Response("Provider returned no user", { status: 401 });
    }
    return establishSession(user, provider.id, { baseUrl }, req);
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

    // Key the lockout on whatever the form calls the account identifier, so
    // username/password forms and email/password forms both lock the account.
    // Two independent buckets guard the two distinct attacks: the *account*
    // bucket (identifier alone) stops guessing one account from many IPs, and
    // the *IP* bucket stops one IP spraying many accounts. They are separate
    // keys on purpose — a single `(IP, identifier)` key is bypassed entirely
    // by rotating source IPs, since each new IP starts a fresh bucket. An
    // absent identifier (a custom provider whose field isn't `username`/`email`
    // /`user`/`identifier`) or an absent client IP is skipped rather than
    // folded into a single shared bucket that would lock out the whole app.
    const identifier = params.username ?? params.email ?? params.user ?? params.identifier ?? "";
    const accountKey = identifier !== "" ? bruteForce.accountKey(identifier) : null;
    const ipKey = bruteForce.ipKey(req);

    // Reserve attempt slots synchronously BEFORE authorizing (no await between
    // the capacity check and the bump). Reserving prevents the TOCTOU race
    // where N parallel bad-password requests all pass the read-only status
    // check before any commits a failure, which would let a credential-stuffing
    // burst sail past `maxAttempts`. The reservation is released on success or
    // converted into a real failure below.
    const accountReserve =
      accountKey === null ? null : { key: accountKey, result: bruteForce.reserve(accountKey) };
    const ipReserve = ipKey === null ? null : { key: ipKey, result: bruteForce.reserve(ipKey) };
    const status = {
      // A missing axis is skipped (treated as allowed), not as a lockout.
      ok:
        (accountReserve === null || accountReserve.result.ok) &&
        (ipReserve === null || ipReserve.result.ok),
      // Retry-After must reflect the longer of the two windows.
      resetAt: Math.max(accountReserve?.result.resetAt ?? 0, ipReserve?.result.resetAt ?? 0),
    };
    if (!status.ok) {
      // Roll back any reservation we did make so a rejected axis doesn't leak
      // an in-flight slot for the other.
      if (accountReserve?.result.ok) bruteForce.release(accountReserve.key);
      if (ipReserve?.result.ok) bruteForce.release(ipReserve.key);
      auditLoginFailure({
        userId: null,
        provider: provider.id,
        ...requestAuditContext(req),
        reason: "rate limited",
      });
      return new Response("Too many sign-in attempts, try again later", {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((status.resetAt - Date.now()) / 1000))),
        },
      });
    }

    const user = await provider.authorize(params, { request: req });
    if (!user?.id) {
      // Convert the reservations into real failures (the synchronous bump is
      // what closes the race), then release the reservation slots.
      if (accountKey !== null) bruteForce.recordFailure(accountKey);
      if (ipKey !== null) bruteForce.recordFailure(ipKey);
      if (accountKey !== null) bruteForce.release(accountKey);
      if (ipKey !== null) bruteForce.release(ipKey);
      auditLoginFailure({
        userId: null,
        provider: provider.id,
        ...requestAuditContext(req),
        reason: "invalid credentials",
      });
      return new Response("Invalid credentials", { status: 401 });
    }
    // Success: roll back both reservations (a successful login is not a failure).
    if (accountKey !== null) bruteForce.release(accountKey);
    if (ipKey !== null) bruteForce.release(ipKey);
    // Reset only the account bucket. The IP bucket must keep counting until its
    // window naturally expires: it aggregates attempts across *all* accounts
    // from that IP, and clearing it on any successful login would let an
    // attacker who owns one account keep resetting the spray counter.
    if (accountKey !== null) bruteForce.reset(accountKey);
    return establishSession(user, provider.id, undefined, req);
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
    if (token) {
      const sessionHash = await hash(token);
      const session = await resolved.store.find(sessionHash);
      await resolved.store.revoke(sessionHash);
      auditLogout({
        userId: session?.userId ?? null,
        ...requestAuditContext(req),
        sessionHash,
      });
    }
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
    const { token, sessionHash } = await createSession(user, provider);
    auditLoginSuccess({ userId: user.id, provider, sessionHash, ip: null });
    return withSetCookie(res, sessionCookieHeader(token));
  };

  const clearSessionCookie = async (res: Response, req?: Request): Promise<Response> => {
    const token = req ? readCookie(req, SESSION_COOKIE) : null;
    if (token) {
      const sessionHash = await hash(token);
      const session = await resolved.store.find(sessionHash);
      await resolved.store.revoke(sessionHash);
      auditLogout({
        userId: session?.userId ?? null,
        ...requestAuditContext(req),
        sessionHash,
      });
    }
    return withSetCookie(res, clearSessionCookieHeader());
  };

  return {
    config: resolved,
    providers,
    handleRequest,
    getSession,
    setSessionCookie,
    clearSessionCookie,
    revokeAllForUser: async (userId) => {
      await resolved.store.revokeAllForUser(userId);
      auditSessionRevoked({ userId, ip: null });
    },
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
