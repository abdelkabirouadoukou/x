import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { defineAuth, SESSION_COOKIE } from "./auth";
import type { CredentialsProvider } from "./providers";
import { createSQLiteSessionStore, type SessionStore } from "./session";

const BASE_URL = "http://localhost:3000";

const dummyProvider: CredentialsProvider = {
  id: "local",
  name: "Local",
  type: "credentials",
  async authorize() {
    return null;
  },
};

function extractCookie(res: Response, name: string): string | null {
  for (const c of res.headers.getSetCookie()) {
    const first = c.split(";")[0] ?? "";
    const eq = first.indexOf("=");
    if (eq !== -1 && first.slice(0, eq) === name) return first.slice(eq + 1);
  }
  return null;
}

function authedRequest(path: string, cookie: string): Request {
  return new Request(`${BASE_URL}${path}`, { headers: { origin: BASE_URL, cookie } });
}

function failingStore(): SessionStore {
  return {
    async create() {},
    async find() {
      throw new Error("connection refused (ECONNREFUSED)");
    },
    async revoke() {},
    async revokeAllForUser() {},
  };
}

describe("getSession store failure", () => {
  test("a store outage fails closed instead of throwing", async () => {
    const auth = defineAuth({
      secret: "test-secret",
      store: failingStore(),
      providers: [dummyProvider],
    });
    const session = await auth.getSession(authedRequest("/", "x_session=some-token"));
    expect(session).toBeNull();
  });

  test("the /session endpoint returns 401, not a 500, when the store is down", async () => {
    const auth = defineAuth({
      secret: "test-secret",
      store: failingStore(),
      providers: [dummyProvider],
    });
    const res = await auth.handleRequest(
      authedRequest("/api/auth/session", "x_session=some-token"),
    );
    expect(res.status).toBe(401);
  });
});

describe("session store swap", () => {
  let dbA: Database;
  let dbB: Database;

  beforeAll(() => {
    dbA = new Database(":memory:");
    dbB = new Database(":memory:");
  });

  afterAll(() => {
    dbA.close();
    dbB.close();
  });

  test("a mid-flight store swap takes effect but does not migrate sessions", async () => {
    const storeA = createSQLiteSessionStore({ db: dbA });
    const storeB = createSQLiteSessionStore({ db: dbB });
    const auth = defineAuth({
      secret: "test-secret",
      store: storeA,
      providers: [dummyProvider],
    });

    const signedIn = await auth.setSessionCookie(
      new Response(null),
      { id: "u_1", email: "a@x.dev" },
      "local",
    );
    const cookie = extractCookie(signedIn, SESSION_COOKIE) as string;
    expect((await auth.getSession(authedRequest("/", `x_session=${cookie}`)))?.userId).toBe("u_1");

    // `config.store` is the live store reference, so the swap takes effect
    // immediately — but sessions are not migrated across stores. A naive swap
    // therefore silently drops existing sessions from lookups.
    auth.config.store = storeB;
    await expect(auth.getSession(authedRequest("/", `x_session=${cookie}`))).resolves.toBeNull();

    // The original store still holds the session intact, so swapping back
    // (or migrating explicitly) restores access without corruption.
    auth.config.store = storeA;
    expect((await auth.getSession(authedRequest("/", `x_session=${cookie}`)))?.userId).toBe("u_1");
  });

  test("a fresh store does not see prior sessions (migration is explicit)", async () => {
    const storeA = createSQLiteSessionStore({ db: dbA });
    const storeB = createSQLiteSessionStore({ db: dbB });
    const authA = defineAuth({
      secret: "test-secret",
      store: storeA,
      providers: [dummyProvider],
    });
    const authB = defineAuth({
      secret: "test-secret",
      store: storeB,
      providers: [dummyProvider],
    });

    const signedIn = await authA.setSessionCookie(
      new Response(null),
      { id: "u_2", email: "b@x.dev" },
      "local",
    );
    const cookie = extractCookie(signedIn, SESSION_COOKIE) as string;

    await expect(authB.getSession(authedRequest("/", `x_session=${cookie}`))).resolves.toBeNull();
    const stillThere = await authA.getSession(authedRequest("/", `x_session=${cookie}`));
    expect(stillThere?.userId).toBe("u_2");
  });
});

describe("generic OAuth2 provider (non-GitHub)", () => {
  let db: Database;
  let auth: ReturnType<typeof defineAuth>;
  const realFetch = globalThis.fetch;
  const tokenBodies: string[] = [];

  beforeAll(() => {
    db = new Database(":memory:");
    auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      providers: [
        {
          id: "idp",
          name: "Identity Provider",
          type: "oauth",
          clientId: "custom-client",
          clientSecret: "custom-secret",
          authorizationUrl: "https://idp.example.com/oauth/authorize",
          tokenUrl: "https://idp.example.com/oauth/token",
          userInfoUrl: "https://idp.example.com/userinfo",
          authorizationParams: { scope: "profile" },
          tokenParams: { audience: "thexjs" },
          profile(p) {
            const user: { id: string; name?: string; email?: string } = {
              id: String(p.sub ?? ""),
            };
            const name = p.preferred_username as string | undefined;
            const email = p.email as string | undefined;
            if (name) user.name = name;
            if (email) user.email = email;
            return user;
          },
        },
      ],
    });

    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/oauth/token")) {
        tokenBodies.push(String(init?.body));
        return Promise.resolve(
          new Response(JSON.stringify({ access_token: "tok-custom", token_type: "bearer" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.includes("/userinfo")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sub: "sub-123",
              preferred_username: "alice",
              email: "alice@idp.example.com",
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

  test("sign-in redirects to the custom authorization URL with the right params", async () => {
    const res = await auth.handleRequest(new Request(`${BASE_URL}/api/auth/signin/idp`));
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") as string);
    expect(location.origin).toBe("https://idp.example.com");
    expect(location.pathname).toBe("/oauth/authorize");
    expect(location.searchParams.get("client_id")).toBe("custom-client");
    expect(location.searchParams.get("redirect_uri")).toBe(`${BASE_URL}/api/auth/callback/idp`);
    expect(location.searchParams.get("scope")).toBe("profile");
    expect(location.searchParams.get("state")).not.toBeNull();
    expect(extractCookie(res, "x_oauth_state")).not.toBeNull();
  });

  test("callback exchanges the code, fetches the profile, and establishes a session", async () => {
    const signIn = await auth.handleRequest(new Request(`${BASE_URL}/api/auth/signin/idp`));
    const state = new URL(signIn.headers.get("location") as string).searchParams.get("state");
    const stateCookie = extractCookie(signIn, "x_oauth_state") as string;
    const pkceCookie = extractCookie(signIn, "x_oauth_pkce") as string;

    const callback = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/callback/idp?code=code-custom&state=${state}`, {
        headers: { cookie: `x_oauth_state=${stateCookie}; x_oauth_pkce=${pkceCookie}` },
      }),
    );
    expect(callback.status).toBe(302);
    const sessionCookie = extractCookie(callback, SESSION_COOKIE);
    expect(sessionCookie).not.toBeNull();

    const session = await auth.getSession(
      authedRequest("/", `x_session=${sessionCookie as string}`),
    );
    expect(session?.provider).toBe("idp");
    expect(session?.user.id).toBe("sub-123");
    expect(session?.user.email).toBe("alice@idp.example.com");

    expect(tokenBodies.at(-1)).toContain("grant_type=authorization_code");
    expect(tokenBodies.at(-1)).toContain("audience=thexjs");
    expect(tokenBodies.at(-1)).toContain("client_secret=custom-secret");
  });

  test("a mismatched state is rejected for the custom provider too", async () => {
    const res = await auth.handleRequest(
      new Request(`${BASE_URL}/api/auth/callback/idp?code=code-custom&state=bad`, {
        headers: { cookie: "x_oauth_state=wrong-token" },
      }),
    );
    expect(res.status).toBe(400);
  });
});
