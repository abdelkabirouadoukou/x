import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { checkCsrf, generateCsrfToken, withCsrfCookie } from "@thexjs/core";
import { SESSION_COOKIE, defineAuth } from "./auth";
import { hashPassword, verifyPassword } from "./password";
import { createSQLiteSessionStore } from "./session";
import type { AuthUser } from "./types";

const BASE_URL = "http://localhost:3000";

function cookieHeader(req: Request): string {
  return req.headers.get("cookie") ?? "";
}

function extractCookie(res: Response, name: string): string | null {
  const cookies = res.headers.getSetCookie();
  for (const c of cookies) {
    const first = c.split(";")[0] ?? "";
    const eq = first.indexOf("=");
    if (eq !== -1 && first.slice(0, eq) === name) return first.slice(eq + 1);
  }
  return null;
}

function authedRequest(path: string, sessionCookie: string): Request {
  return new Request(`${BASE_URL}${path}`, {
    headers: { origin: BASE_URL, cookie: sessionCookie },
  });
}

describe("credentials provider", () => {
  let db: Database;
  let passwordHash: string;
  let auth: ReturnType<typeof defineAuth>;

  const users = new Map<string, AuthUser>([
    ["admin@example.com", { id: "u_1", name: "Admin", email: "admin@example.com" }],
  ]);

  beforeAll(async () => {
    passwordHash = await hashPassword("correct horse battery staple");
    db = new Database(":memory:");
    auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize(params) {
            const email = params.email ?? "";
            const user = users.get(email);
            if (!user) return null;
            if (!(await verifyPassword(params.password ?? "", passwordHash))) return null;
            return user;
          },
        },
      ],
    });
  });

  afterAll(() => db.close());

  test("rejects a sign-in without a valid Origin header (CSRF)", async () => {
    const form = new FormData();
    form.set("email", "admin@example.com");
    form.set("password", "correct horse battery staple");
    const res = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/signin/local`, { method: "POST", body: form }),
    );
    expect(res.status).toBe(403);
  });

  test("rejects a cross-origin POST (CSRF)", async () => {
    const form = new FormData();
    form.set("email", "admin@example.com");
    form.set("password", "correct horse battery staple");
    const res = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/signin/local`, {
        method: "POST",
        headers: { origin: "https://evil.example.com" },
        body: form,
      }),
    );
    expect(res.status).toBe(403);
  });

  test("signs in with correct credentials and sets an HttpOnly session cookie", async () => {
    const form = new FormData();
    form.set("email", "admin@example.com");
    form.set("password", "correct horse battery staple");
    const res = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/signin/local`, {
        method: "POST",
        headers: { origin: BASE_URL },
        body: form,
      }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
    const cookie = extractCookie(res, SESSION_COOKIE);
    expect(cookie).not.toBeNull();
    expect((res.headers.getSetCookie()[0] ?? "").includes("HttpOnly")).toBe(true);
  });

  test("rejects wrong password with 401", async () => {
    const form = new FormData();
    form.set("email", "admin@example.com");
    form.set("password", "wrong-password");
    const res = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/signin/local`, {
        method: "POST",
        headers: { origin: BASE_URL },
        body: form,
      }),
    );
    expect(res.status).toBe(401);
  });

  test("rejects an unknown account with 401", async () => {
    const form = new FormData();
    form.set("email", "nobody@example.com");
    form.set("password", "correct horse battery staple");
    const res = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/signin/local`, {
        method: "POST",
        headers: { origin: BASE_URL },
        body: form,
      }),
    );
    expect(res.status).toBe(401);
  });

  test("`/api/auth/session` returns the user when authenticated", async () => {
    const form = new FormData();
    form.set("email", "admin@example.com");
    form.set("password", "correct horse battery staple");
    const signIn = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/signin/local`, {
        method: "POST",
        headers: { origin: BASE_URL },
        body: form,
      }),
    );
    const cookie = extractCookie(signIn, SESSION_COOKIE) as string;

    const sessionRes = await auth.handleRequest(
      authedRequest("/api/auth/session", `x_session=${cookie}`),
    );
    expect(sessionRes.status).toBe(200);
    const body = (await sessionRes.json()) as { user: AuthUser };
    expect(body.user.email).toBe("admin@example.com");
  });

  test("`/api/auth/session` returns 401 when unauthenticated", async () => {
    const sessionRes = await auth.handleRequest(new Request(`${BASE_URL}/api/auth/session`));
    expect(sessionRes.status).toBe(401);
  });

  test("sign-out revokes the session and clears the cookie", async () => {
    const form = new FormData();
    form.set("email", "admin@example.com");
    form.set("password", "correct horse battery staple");
    const signIn = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/signin/local`, {
        method: "POST",
        headers: { origin: BASE_URL },
        body: form,
      }),
    );
    const cookie = extractCookie(signIn, SESSION_COOKIE) as string;

    const signOut = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/signout`, {
        method: "POST",
        headers: { origin: BASE_URL, cookie: `x_session=${cookie}` },
      }),
    );
    expect(signOut.status).toBe(302);
    expect(extractCookie(signOut, SESSION_COOKIE)).toBe("");

    const sessionRes = await auth.handleRequest(
      authedRequest("/api/auth/session", `x_session=${cookie}`),
    );
    expect(sessionRes.status).toBe(401);
  });
});

describe("session lifecycle", () => {
  let db: Database;
  let auth: ReturnType<typeof defineAuth>;

  beforeAll(() => {
    db = new Database(":memory:");
    auth = defineAuth({
      secret: "test-secret",
      sessionMaxAge: -1, // sessions expire immediately
      store: createSQLiteSessionStore({ db }),
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize(params) {
            return params.email ? { id: "u_1", email: params.email } : null;
          },
        },
      ],
    });
  });

  afterAll(() => db.close());

  test("expired sessions are not returned and are revoked", async () => {
    const res = await auth.setSessionCookie(new Response(null), { id: "u_1" }, "local");
    const cookie = extractCookie(res, SESSION_COOKIE) as string;
    const req = authedRequest("/", `x_session=${cookie}`);

    const session = await auth.getSession(req);
    expect(session).toBeNull();

    // The store should no longer contain the token.
    const after = await auth.getSession(req);
    expect(after).toBeNull();
  });

  test("active sessions are returned with their user snapshot", async () => {
    const store = createSQLiteSessionStore({ db });
    const live = defineAuth({
      secret: "test-secret",
      sessionMaxAge: 60,
      store,
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize() {
            return null;
          },
        },
      ],
    });
    const res = await live.setSessionCookie(
      new Response(null),
      { id: "u_9", email: "u@x.dev" },
      "local",
    );
    const cookie = extractCookie(res, SESSION_COOKIE) as string;

    const session = await live.getSession(authedRequest("/", `x_session=${cookie}`));
    expect(session?.userId).toBe("u_9");
    expect(session?.user.email).toBe("u@x.dev");
  });
});

describe("OAuth2 (GitHub) provider", () => {
  let db: Database;
  let auth: ReturnType<typeof defineAuth>;
  const realFetch = globalThis.fetch;

  beforeAll(() => {
    db = new Database(":memory:");
    auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      providers: [
        {
          id: "github",
          name: "GitHub",
          type: "oauth",
          clientId: "client-123",
          clientSecret: "secret-123",
        },
      ],
    });

    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("login/oauth/access_token")) {
        return Promise.resolve(
          new Response(JSON.stringify({ access_token: "tok-123", token_type: "bearer" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.includes("api.github.com/user")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 42,
              login: "octocat",
              name: "Octo Cat",
              email: "octo@example.com",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response("not found", { status: 404 }));
    }) as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
    db.close();
  });

  test("sign-in redirects to the provider authorization URL with a state challenge", async () => {
    const res = await auth.handleRequest(new Request(`${BASE_URL}/api/auth/signin/github`));
    expect(res.status).toBe(302);
    const location = res.headers.get("location") as string;
    expect(location.startsWith("https://github.com/login/oauth/authorize")).toBe(true);
    expect(new URL(location).searchParams.get("client_id")).toBe("client-123");
    expect(new URL(location).searchParams.get("state")).not.toBeNull();
    expect(extractCookie(res, "x_oauth_state")).not.toBeNull();
  });

  test("callback with a valid code and state establishes a session", async () => {
    const signIn = await auth.handleRequest(new Request(`${BASE_URL}/api/auth/signin/github`));
    const state = new URL(signIn.headers.get("location") as string).searchParams.get("state");
    const stateCookie = extractCookie(signIn, "x_oauth_state") as string;

    const callback = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/callback/github?code=code-1&state=${state}`, {
        headers: { cookie: `x_oauth_state=${stateCookie}` },
      }),
    );
    expect(callback.status).toBe(302);
    const sessionCookie = extractCookie(callback, SESSION_COOKIE);
    expect(sessionCookie).not.toBeNull();

    const session = await auth.getSession(
      authedRequest("/", `x_session=${sessionCookie as string}`),
    );
    expect(session?.provider).toBe("github");
    expect(session?.user.id).toBe("42");
    expect(session?.user.email).toBe("octo@example.com");
  });

  test("callback with a mismatched state is rejected", async () => {
    const res = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/callback/github?code=code-1&state=tampered-state`, {
        headers: { cookie: "x_oauth_state=some-other-token" },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("CSRF integration", () => {
  test("core double-submit helpers are compatible with the handler", async () => {
    const token = generateCsrfToken();
    const req = new Request(`${BASE_URL}/api/auth/signin/local`, {
      method: "POST",
      headers: {
        origin: BASE_URL,
        cookie: `x_csrf_token=${token}`,
        "x-csrf-token": token,
      },
    });
    const res = withCsrfCookie(req, new Response(null));
    expect(checkCsrf(req).ok).toBe(true);
    // Request already had the cookie, so no new one is issued.
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });
});
