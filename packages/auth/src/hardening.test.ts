import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { configureTrustedProxy, resetTrustedProxy } from "@thexjs/core";
import { defineAuth, OAUTH_PKCE_COOKIE, OAUTH_STATE_COOKIE, SESSION_COOKIE } from "./auth";
import { createBruteForceGuard } from "./brute-force";
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
    // A second account no other test touches, so this can use it as the
    // "attacker-controlled" account without inheriting a locked bucket.
    if (
      params.email === "owner@example.com" &&
      params.password === "correct horse battery staple"
    ) {
      return { id: "u_2", name: "Owner", email: "owner@example.com" };
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
    configureTrustedProxy({ trustForwardedHeaders: true });
    db = new Database(":memory:");
    auth = defineAuth({
      secret: "test-secret",
      loginBruteForce: { maxAttempts: 3, windowMs: 60_000 },
      store: createSQLiteSessionStore({ db }),
      providers: [credentialsProvider],
    });
  });

  afterAll(() => {
    db.close();
    resetTrustedProxy();
  });

  test("locks an account after maxAttempts consecutive failures and returns 429", async () => {
    const ip = "203.0.113.20";
    for (let i = 0; i < 3; i++) {
      const res = await auth.handleRequest(
        signInRequest("lockout@example.com", "wrong", { "x-forwarded-for": ip }),
      );
      expect(res.status).toBe(401);
    }
    const locked = await auth.handleRequest(
      signInRequest("lockout@example.com", "wrong", { "x-forwarded-for": ip }),
    );
    expect(locked.status).toBe(429);
    expect(locked.headers.get("Retry-After")).toBeTruthy();
  });

  test("parallel bad-password requests admit at most maxAttempts to authorize (#168)", async () => {
    const ip = "203.0.113.25";
    // With a persisted lockout of 3, a burst of N parallel requests must not
    // all pass the pre-authorize gate. The synchronous reserve caps admission.
    const responses = await Promise.all(
      Array.from({ length: 12 }, () =>
        auth.handleRequest(
          signInRequest("burst-lock@example.com", "wrong", { "x-forwarded-for": ip }),
        ),
      ),
    );
    const authorized = responses.filter((r) => r.status === 401).length;
    const throttled = responses.filter((r) => r.status === 429).length;

    // At most maxAttempts (3) proceeded to the (failing) provider; the rest 429.
    expect(authorized).toBeLessThanOrEqual(3);
    expect(throttled + authorized).toBe(12);
    expect(throttled).toBeGreaterThanOrEqual(9);
  });

  test("a successful sign-in clears the lockout bucket", async () => {
    const ip = "203.0.113.21";
    for (let i = 0; i < 2; i++) {
      await auth.handleRequest(
        signInRequest("admin@example.com", "wrong", { "x-forwarded-for": ip }),
      );
    }
    const ok = await auth.handleRequest(
      signInRequest("admin@example.com", "correct horse battery staple", {
        "x-forwarded-for": ip,
      }),
    );
    expect(ok.status).toBe(302);

    for (let i = 0; i < 3; i++) {
      await auth.handleRequest(
        signInRequest("admin@example.com", "wrong", { "x-forwarded-for": ip }),
      );
    }
    const relocked = await auth.handleRequest(
      signInRequest("admin@example.com", "wrong", { "x-forwarded-for": ip }),
    );
    expect(relocked.status).toBe(429);
  });

  test("lockout is per account: a different account from a different IP is unaffected", async () => {
    for (let i = 0; i < 3; i++) {
      await auth.handleRequest(
        signInRequest("victim@example.com", "wrong", { "x-forwarded-for": "203.0.113.10" }),
      );
    }
    expect(
      (
        await auth.handleRequest(
          signInRequest("victim@example.com", "wrong", { "x-forwarded-for": "203.0.113.10" }),
        )
      ).status,
    ).toBe(429);
    // A different account from a different IP keeps getting the ordinary 401,
    // not a lockout — the account bucket is scoped to the identifier alone.
    expect(
      (
        await auth.handleRequest(
          signInRequest("other@example.com", "wrong", { "x-forwarded-for": "203.0.113.11" }),
        )
      ).status,
    ).toBe(401);
  });

  test("rotating source IPs cannot dodge the account lockout", async () => {
    // One attacker, many IPs (botnet / proxy pool). Each request comes from a
    // different client IP — under the old `(IP, identifier)` composite key
    // every attempt started a fresh bucket and maxAttempts was never reached.
    for (let i = 0; i < 3; i++) {
      const res = await auth.handleRequest(
        signInRequest("distributed@example.com", "wrong", {
          "x-forwarded-for": `203.0.113.${i + 1}`,
        }),
      );
      expect(res.status).toBe(401);
    }
    // Same account, yet another IP: the account bucket is keyed by identifier
    // alone, so it must be locked regardless of the source IP.
    const locked = await auth.handleRequest(
      signInRequest("distributed@example.com", "wrong", { "x-forwarded-for": "203.0.113.99" }),
    );
    expect(locked.status).toBe(429);
    expect(locked.headers.get("Retry-After")).toBeTruthy();
  });

  test("one IP spraying many accounts is still throttled", async () => {
    // The IP bucket is keyed by client IP alone, so a single node trying many
    // usernames trips it without locking out a *specific* account for anyone
    // sharing that network.
    for (let i = 0; i < 3; i++) {
      const res = await auth.handleRequest(
        signInRequest(`spray-target-${i}@example.com`, "wrong", {
          "x-forwarded-for": "198.51.100.42",
        }),
      );
      expect(res.status).toBe(401);
    }
    const throttled = await auth.handleRequest(
      signInRequest("yet-another@example.com", "wrong", {
        "x-forwarded-for": "198.51.100.42",
      }),
    );
    expect(throttled.status).toBe(429);
  });

  test("a successful login does NOT clear the aggregate IP bucket (#133)", async () => {
    // Attacker controls one account (admin@example.com). Failure-sprinkling
    // against other accounts from the attacker's IP fills the IP bucket; the
    // attacker then signing into their own account must NOT reset it, or the
    // spray limit would be trivially bypassed by alternating failures with a
    // single successful login.
    const ip = "203.0.113.40";
    // Two failures (not three) so the IP bucket is one short of locking, and
    // the attacker's own successful login below must NOT top it up or erase it.
    for (let i = 0; i < 2; i++) {
      await auth.handleRequest(
        signInRequest(`spray-victim-${i}@example.com`, "wrong", { "x-forwarded-for": ip }),
      );
    }
    // Attacker's own successful login (resets only their account bucket)...
    const own = await auth.handleRequest(
      signInRequest("owner@example.com", "correct horse battery staple", { "x-forwarded-for": ip }),
    );
    expect(own.status).toBe(302); // ...unless the IP bucket was mistakenly cleared
    // ...must leave the IP bucket intact: the very next failure after the
    // success already tops the bucket up to maxAttempts...
    expect(
      (
        await auth.handleRequest(
          signInRequest("spray-victim-2@example.com", "wrong", { "x-forwarded-for": ip }),
        )
      ).status,
    ).toBe(401);
    // ...and the one after that is throttled immediately.
    const next = await auth.handleRequest(
      signInRequest("spray-victim-3@example.com", "wrong", { "x-forwarded-for": ip }),
    );
    expect(next.status).toBe(429);
  });

  test("empty identifiers are not folded into one global account bucket (#133)", async () => {
    // A custom credentials provider may call the field `login`/`handle`/...,
    // which this flow doesn't recognize → identifier "". Those failures must
    // not all land in a single `login:` key (which would lock the whole
    // provider); the account axis is skipped and only the IP axis applies.
    const form = new FormData();
    form.set("password", "wrong");
    const emptyId = (extra: Record<string, string> = {}): Request =>
      new Request(`${BASE_URL}/api/auth/signin/local`, {
        method: "POST",
        headers: { origin: BASE_URL, ...extra },
        body: form,
      });

    for (let i = 0; i < 3; i++) {
      const res = await auth.handleRequest(emptyId({ "x-forwarded-for": `203.0.113.5${i}` }));
      expect(res.status).toBe(401);
    }
    // A fresh empty-id attempt from a new IP is not throttled: failures only
    // accumulate per-IP. (Under a shared `login:` account key, three failures
    // from any IPs would lock this fourth attempt.)
    const fresh = await auth.handleRequest(emptyId({ "x-forwarded-for": "203.0.113.99" }));
    expect(fresh.status).toBe(401);
  });

  test("clients with no IP header are not throttled as one shared 'unknown' IP (#133)", async () => {
    // No x-forwarded-for / x-real-ip anywhere: the IP axis must be skipped
    // (per-IP bucket would otherwise merge every header-less client into one
    // `unknown` bucket and lock them all out together).
    for (let i = 0; i < 3; i++) {
      await auth.handleRequest(signInRequest("headless-a@example.com", "wrong"));
    }
    expect(
      (await auth.handleRequest(signInRequest("headless-a@example.com", "wrong"))).status,
    ).toBe(429); // account bucket locked the account itself...
    // ...but a different account, also header-less, is a fresh account bucket.
    expect(
      (await auth.handleRequest(signInRequest("headless-b@example.com", "wrong"))).status,
    ).toBe(401);
  });
});

describe("auth hardening: a throwing provider cannot permanently lock an account/IP (#236)", () => {
  let db: Database;
  let auth: ReturnType<typeof defineAuth>;
  let shouldThrow: boolean;

  const flakyProvider = {
    id: "flaky",
    name: "Flaky",
    type: "credentials" as const,
    async authorize(params: Record<string, string>) {
      // Simulate a provider hitting a transient DB outage, then recovering.
      if (shouldThrow) throw new Error("db outage");
      return { id: "u_flaky", name: "Flaky", email: params.email ?? "flaky@example.com" };
    },
  };

  const flakyRequest = (email: string, ip: string): Request => {
    const form = new FormData();
    form.set("email", email);
    form.set("password", "whatever");
    return new Request(`${BASE_URL}/api/auth/signin/flaky`, {
      method: "POST",
      headers: { origin: BASE_URL, "x-forwarded-for": ip },
      body: form,
    });
  };

  beforeAll(() => {
    configureTrustedProxy({ trustForwardedHeaders: true });
    db = new Database(":memory:");
    shouldThrow = true;
    auth = defineAuth({
      secret: "test-secret",
      loginBruteForce: { maxAttempts: 3, windowMs: 60_000 },
      store: createSQLiteSessionStore({ db }),
      providers: [flakyProvider],
    });
  });

  afterAll(() => {
    db.close();
    resetTrustedProxy();
  });

  test("reservations are released on throw, so a later healthy attempt still succeeds (#236)", async () => {
    const ip = "203.0.113.60";
    const email = "flake-reservations@example.com";
    // Fire the throwing provider several times — well past `maxAttempts` (3).
    // Each throw returns 5xx WITHOUT recording a failure, so the account/IP
    // buckets must not lock.
    shouldThrow = true;
    for (let i = 0; i < 5; i++) {
      const res = await auth.handleRequest(flakyRequest(email, ip));
      expect(res.status).toBe(500);
    }
    // The provider recovers. Because every prior throw released its reservations
    // (rather than leaking `inflight` capacity) and recorded no brute-force
    // failure, this resolving attempt must still be admitted: 302, not a
    // permanent 429.
    shouldThrow = false;
    const ok = await auth.handleRequest(flakyRequest(email, ip));
    expect(ok.status).toBe(302);
    // The reservation counter has no expiry (#236): if any reservation had been
    // leaked, the next attempt — even a failing one — would have been refused
    // with a permanent 429. Restore the throw and confirm a fresh burst still
    // resolves to 5xx (server fault) rather than a phantom lockout.
    shouldThrow = true;
    const after = await auth.handleRequest(flakyRequest(email, ip));
    expect(after.status).toBe(500);
  });
});

// Real-Postgres integration tests. Skipped unless DATABASE_URL is set (see
// PG_TEST_URL above); CI provides one through a postgres service container.
describe("auth hardening: brute-force guard internals", () => {
  test("account and IP buckets are namespaced apart (#133)", () => {
    configureTrustedProxy({ trustForwardedHeaders: true });
    try {
      const guard = createBruteForceGuard({ maxAttempts: 3, windowMs: 60_000 });
      guard.dispose();
      // An identifier that looks like an IP must not key the same bucket as the
      // actual client IP — a collision would share failures/resets between the
      // account and IP axes and break independent throttling.
      const identifier = "198.51.100.42";
      const req = new Request("http://x/", {
        headers: { "x-forwarded-for": identifier },
      });
      expect(guard.accountKey(identifier)).not.toBe(guard.ipKey(req));
    } finally {
      resetTrustedProxy();
    }
  });

  test("ipKey is null when no client IP is knowable (#133)", () => {
    const guard = createBruteForceGuard();
    guard.dispose();
    // With trustForwardedHeaders = false (default), even x-real-ip is ignored.
    const bare = new Request("http://x/");
    expect(guard.ipKey(bare)).toBeNull();
    const withIp = new Request("http://x/", { headers: { "x-real-ip": "203.0.113.7" } });
    expect(guard.ipKey(withIp)).toBeNull();
  });

  test("ipKey resolves when trustForwardedHeaders is true", () => {
    configureTrustedProxy({ trustForwardedHeaders: true });
    try {
      const guard = createBruteForceGuard();
      guard.dispose();
      const withIp = new Request("http://x/", { headers: { "x-real-ip": "203.0.113.7" } });
      expect(guard.ipKey(withIp)).toBe("login:ip:203.0.113.7");
    } finally {
      resetTrustedProxy();
    }
  });

  test("attacker-set X-Forwarded-For does not create separate IP buckets when untrusted", () => {
    // Default: trustForwardedHeaders = false. Two requests with different
    // x-forwarded-for headers both resolve to null IP → same (null) bucket key.
    // The IP axis is simply skipped; the account axis still locks.
    const guard = createBruteForceGuard({ maxAttempts: 2, windowMs: 60_000 });
    guard.dispose();

    const reqA = new Request("http://x/", { headers: { "x-forwarded-for": "attacker-A" } });
    const reqB = new Request("http://x/", { headers: { "x-forwarded-for": "attacker-B" } });

    // Both resolve to null when untrusted → no IP bucket at all.
    expect(guard.ipKey(reqA)).toBeNull();
    expect(guard.ipKey(reqB)).toBeNull();

    // Both land in the same account bucket.
    const key = guard.accountKey("victim@example.com");
    guard.recordFailure(key);
    guard.recordFailure(key);
    expect(guard.status(key).ok).toBe(false); // locked after 2 failures

    // A fresh attempt from "attacker-B" is still locked — the account bucket
    // is shared regardless of spoofed IP headers.
    expect(guard.status(key).ok).toBe(false);
    guard.dispose();
  });

  test("genuinely trusted and consistent X-Forwarded-For lands in the same IP bucket", () => {
    configureTrustedProxy({ trustForwardedHeaders: true });
    try {
      const guard = createBruteForceGuard({ maxAttempts: 2, windowMs: 60_000 });
      guard.dispose();

      const reqA = new Request("http://x/", { headers: { "x-forwarded-for": "203.0.113.99" } });
      const reqB = new Request("http://x/", { headers: { "x-forwarded-for": "203.0.113.99" } });

      expect(guard.ipKey(reqA)).toBe("login:ip:203.0.113.99");
      expect(guard.ipKey(reqB)).toBe("login:ip:203.0.113.99");

      const keyA = guard.ipKey(reqA) as string;
      const keyB = guard.ipKey(reqB) as string;
      expect(keyA).toBe(keyB);

      guard.recordFailure(keyA);
      guard.recordFailure(keyA);
      expect(guard.status(keyA).ok).toBe(false);
      expect(guard.status(keyB).ok).toBe(false); // same bucket
      guard.dispose();
    } finally {
      resetTrustedProxy();
    }
  });

  test("reserve is synchronous and caps in-flight attempts at maxAttempts (#168)", () => {
    const guard = createBruteForceGuard({ maxAttempts: 3, windowMs: 60_000 });
    guard.dispose();
    const key = guard.accountKey("burst@example.com");

    // Three reservations are allowed (one per attempt slot)...
    expect(guard.reserve(key).ok).toBe(true);
    expect(guard.reserve(key).ok).toBe(true);
    expect(guard.reserve(key).ok).toBe(true);
    // ...a fourth is refused immediately with no authorize work.
    expect(guard.reserve(key).ok).toBe(false);

    // Releasing a slot (rollback on success) restores capacity.
    guard.release(key);
    expect(guard.reserve(key).ok).toBe(true);

    // A reservation does not itself count as a persisted failure.
    expect(guard.status(key).ok).toBe(true);
    guard.dispose();
  });

  test("parallel reservers close the TOCTOU — at most maxAttempts proceed (#168)", async () => {
    configureTrustedProxy({ trustForwardedHeaders: true });
    try {
      const guard = createBruteForceGuard({ maxAttempts: 3, windowMs: 60_000 });
      guard.dispose();
      const key = guard.accountKey("parallel@example.com");

      // Simulate the sign-in gate: N concurrent requests all attempt to reserve
      // before authorizing. The synchronous in-flight cap must admit <= 3.
      const results = await Promise.all(
        Array.from({ length: 10 }, () => Promise.resolve().then(() => guard.reserve(key))),
      );
      const admitted = results.filter((r) => r.ok).length;

      expect(admitted).toBeLessThanOrEqual(3);
      // The refused ones returned ok:false so the caller responds 429.
      expect(results.filter((r) => !r.ok).length).toBeGreaterThanOrEqual(7);
      guard.dispose();
    } finally {
      resetTrustedProxy();
    }
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
