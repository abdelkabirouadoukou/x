import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { defineAuth, OAUTH_PKCE_COOKIE, OAUTH_STATE_COOKIE, SESSION_COOKIE } from "./auth";
import { createSQLiteSessionStore } from "./session";

const BASE_URL = "http://localhost:3000";

function extractCookie(res: Response, name: string): string | null {
  const cookies = res.headers.getSetCookie();
  for (const c of cookies) {
    const first = c.split(";")[0] ?? "";
    const eq = first.indexOf("=");
    if (eq !== -1 && first.slice(0, eq) === name) return first.slice(eq + 1);
  }
  return null;
}

function signInRequest(
  email: string,
  password: string,
  extra: Record<string, string> = {},
): Request {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  return new Request(`${BASE_URL}/api/auth/signin/local`, {
    method: "POST",
    headers: { origin: BASE_URL, ...extra },
    body: form,
  });
}

const credentialsProvider = {
  id: "local",
  name: "Local",
  type: "credentials" as const,
  async authorize(params: Record<string, string>) {
    if (
      params.email === "admin@example.com" &&
      params.password === "correct horse battery staple"
    ) {
      return { id: "u_1", name: "Admin", email: "admin@example.com" };
    }
    return null;
  },
};

describe("auth hardening: secret handling", () => {
  test("throws when no secret is configured in production", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(() =>
        defineAuth({
          store: createSQLiteSessionStore({ db: new Database(":memory:") }),
          providers: [credentialsProvider],
        }),
      ).toThrow(/secret/);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  test("session tokens are 256-bit CSPRNG hex, not Math.random-derived", async () => {
    const db = new Database(":memory:");
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      providers: [credentialsProvider],
    });
    const res = await auth.handleRequest(
      signInRequest("admin@example.com", "correct horse battery staple"),
    );
    const token = extractCookie(res, SESSION_COOKIE) as string;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    db.close();
  });
});

describe("auth hardening: brute-force lockout on credentials", () => {
  let db: Database;
  let auth: ReturnType<typeof defineAuth>;

  beforeAll(() => {
    db = new Database(":memory:");
    auth = defineAuth({
      secret: "test-secret",
      loginBruteForce: { maxAttempts: 3, windowMs: 60_000 },
      store: createSQLiteSessionStore({ db }),
      providers: [credentialsProvider],
    });
  });

  afterAll(() => db.close());

  test("locks an account after maxAttempts consecutive failures and returns 429", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await auth.handleRequest(signInRequest("lockout@example.com", "wrong"));
      expect(res.status).toBe(401);
    }
    const locked = await auth.handleRequest(signInRequest("lockout@example.com", "wrong"));
    expect(locked.status).toBe(429);
    expect(locked.headers.get("Retry-After")).toBeTruthy();
  });

  test("a successful sign-in clears the lockout bucket", async () => {
    for (let i = 0; i < 2; i++) {
      await auth.handleRequest(signInRequest("admin@example.com", "wrong"));
    }
    const ok = await auth.handleRequest(
      signInRequest("admin@example.com", "correct horse battery staple"),
    );
    expect(ok.status).toBe(302);

    for (let i = 0; i < 3; i++) {
      await auth.handleRequest(signInRequest("admin@example.com", "wrong"));
    }
    const relocked = await auth.handleRequest(signInRequest("admin@example.com", "wrong"));
    expect(relocked.status).toBe(429);
  });

  test("lockout is per account: other accounts from the same IP are unaffected", async () => {
    for (let i = 0; i < 3; i++) {
      await auth.handleRequest(signInRequest("victim@example.com", "wrong"));
    }
    expect((await auth.handleRequest(signInRequest("victim@example.com", "wrong"))).status).toBe(
      429,
    );
    // A different account keeps getting the ordinary 401, not a lockout.
    expect((await auth.handleRequest(signInRequest("other@example.com", "wrong"))).status).toBe(
      401,
    );
  });
});

describe("auth hardening: revoke all sessions for a user", () => {
  let db: Database;
  let auth: ReturnType<typeof defineAuth>;

  beforeAll(() => {
    db = new Database(":memory:");
    auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      providers: [credentialsProvider],
    });
  });

  afterAll(() => db.close());

  test("revokeAllForUser kills every active session for that user", async () => {
    const first = await auth.handleRequest(
      signInRequest("admin@example.com", "correct horse battery staple"),
    );
    const second = await auth.handleRequest(
      signInRequest("admin@example.com", "correct horse battery staple"),
    );
    const tokenA = extractCookie(first, SESSION_COOKIE) as string;
    const tokenB = extractCookie(second, SESSION_COOKIE) as string;
    expect(tokenA).not.toBe(tokenB);

    const stillValid = await auth.getSession(
      new Request(`${BASE_URL}/`, { headers: { cookie: `x_session=${tokenB}` } }),
    );
    expect(stillValid?.userId).toBe("u_1");

    await auth.revokeAllForUser("u_1");

    expect(
      await auth.getSession(
        new Request(`${BASE_URL}/`, { headers: { cookie: `x_session=${tokenA}` } }),
      ),
    ).toBeNull();
    expect(
      await auth.getSession(
        new Request(`${BASE_URL}/`, { headers: { cookie: `x_session=${tokenB}` } }),
      ),
    ).toBeNull();
  });
});

describe("auth hardening: secure cookies", () => {
  test("forceSecureCookie adds the Secure flag outside production", async () => {
    const db = new Database(":memory:");
    const auth = defineAuth({
      secret: "test-secret",
      forceSecureCookie: true,
      store: createSQLiteSessionStore({ db }),
      providers: [credentialsProvider],
    });
    const res = await auth.handleRequest(
      signInRequest("admin@example.com", "correct horse battery staple"),
    );
    const setCookie = res.headers.getSetCookie()[0] ?? "";
    expect(setCookie).toContain("Secure");
    db.close();
  });

  test("cookies are not Secure outside production by default", async () => {
    const db = new Database(":memory:");
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      providers: [credentialsProvider],
    });
    const res = await auth.handleRequest(
      signInRequest("admin@example.com", "correct horse battery staple"),
    );
    const setCookie = res.headers.getSetCookie()[0] ?? "";
    expect(setCookie).not.toContain("Secure");
    expect(setCookie).toContain("HttpOnly");
    db.close();
  });
});

describe("auth hardening: PKCE on the OAuth2 flow", () => {
  let db: Database;
  let auth: ReturnType<typeof defineAuth>;
  let capturedVerifier: string | null = null;
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
        capturedVerifier = init?.body ? (init.body as URLSearchParams).get("code_verifier") : null;
        return Promise.resolve(
          new Response(JSON.stringify({ access_token: "tok-123", token_type: "bearer" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.includes("api.github.com/user")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: 42, login: "octocat", email: "octo@example.com" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response("not found", { status: 404 }));
    }) as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
    db.close();
  });

  test("sign-in sends an S256 challenge and stores the verifier in its own cookie", async () => {
    const res = await auth.handleRequest(new Request(`${BASE_URL}/api/auth/signin/github`));
    const location = new URL(res.headers.get("location") as string);
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    const challenge = location.searchParams.get("code_challenge");
    expect(challenge).not.toBeNull();

    const verifier = extractCookie(res, OAUTH_PKCE_COOKIE);
    expect(verifier).not.toBeNull();
    expect(
      createHash("sha256")
        .update(verifier as string)
        .digest("base64url"),
    ).toBe(challenge as string);
  });

  test("callback exchanges the code with the matching verifier", async () => {
    const signIn = await auth.handleRequest(new Request(`${BASE_URL}/api/auth/signin/github`));
    const state = new URL(signIn.headers.get("location") as string).searchParams.get("state");
    const stateCookie = extractCookie(signIn, OAUTH_STATE_COOKIE) as string;
    const pkceCookie = extractCookie(signIn, OAUTH_PKCE_COOKIE) as string;

    capturedVerifier = null;
    const callback = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/callback/github?code=code-1&state=${state}`, {
        headers: { cookie: `x_oauth_state=${stateCookie}; ${OAUTH_PKCE_COOKIE}=${pkceCookie}` },
      }),
    );
    expect(callback.status).toBe(302);
    expect(capturedVerifier as string | null).toBe(pkceCookie);
  });

  test("callback without a PKCE verifier fails closed", async () => {
    const signIn = await auth.handleRequest(new Request(`${BASE_URL}/api/auth/signin/github`));
    const state = new URL(signIn.headers.get("location") as string).searchParams.get("state");
    const stateCookie = extractCookie(signIn, OAUTH_STATE_COOKIE) as string;

    const callback = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/callback/github?code=code-1&state=${state}`, {
        headers: { cookie: `x_oauth_state=${stateCookie}` },
      }),
    );
    expect(callback.status).toBe(400);
  });
});
