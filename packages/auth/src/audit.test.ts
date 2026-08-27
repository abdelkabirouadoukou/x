import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  type AuditEntry,
  type AuditSink,
  configureTrustedProxy,
  noopAuditSink,
  resetTrustedProxy,
  setAuditSink,
} from "@thexjs/core";
import { defineAuth, SESSION_COOKIE } from "./auth";
import type { CredentialsProvider } from "./providers";
import { createSQLiteSessionStore } from "./session";

/**
 * Audit-trail coverage for the auth flows (#74). Every security-relevant
 * boundary the framework controls — login success/failure, sign-out, session
 * revocation, RBAC permission-denied — must emit a structured entry carrying
 * userId-or-null + ip + reason, and must never contain a password or token.
 */

const BASE_URL = "http://localhost:3000";

type Entry = AuditEntry & { [k: string]: unknown };
let entries: Entry[] = [];

const capturingSink: AuditSink = {
  write(entry) {
    entries.push(entry as Entry);
  },
};

const dummyProvider: CredentialsProvider = {
  id: "local",
  name: "Local",
  type: "credentials",
  async authorize() {
    return null;
  },
};

const acceptingProvider: CredentialsProvider = {
  id: "local",
  name: "Local",
  type: "credentials",
  async authorize() {
    return { id: "u_42", name: "Alice", email: "alice@x.dev" };
  },
};

function post(path: string, body?: string, extraHeaders: Record<string, string> = {}) {
  return new Request(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: BASE_URL,
      "x-forwarded-for": "203.0.113.99",
      ...extraHeaders,
    },
    ...(body !== undefined ? { body } : {}),
  });
}

function extractCookie(res: Response, name: string): string | null {
  for (const c of res.headers.getSetCookie()) {
    const first = c.split(";")[0] ?? "";
    const eq = first.indexOf("=");
    if (eq !== -1 && first.slice(0, eq) === name) return first.slice(eq + 1);
  }
  return null;
}

beforeAll(() => {
  configureTrustedProxy({ trustForwardedHeaders: true });
  setAuditSink(capturingSink);
});

afterAll(() => {
  setAuditSink(noopAuditSink);
  resetTrustedProxy();
});

describe("audit: credentials sign-in", () => {
  test("a failed credentials sign-in emits auth.login.failure with ip + reason", async () => {
    entries = [];
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db: new Database(":memory:") }),
      providers: [dummyProvider],
    });

    const res = await auth.handleRequest(
      post("/api/auth/signin/local", "email=alice@x.dev&password=wrongpassword"),
    );
    expect(res.status).toBe(401);

    const entry = entries.at(-1) as Entry;
    expect(entry.event).toBe("auth.login.failure");
    expect(entry.userId).toBeNull();
    expect(entry.ip).toBe("203.0.113.99");
    expect(entry.reason).toBe("invalid credentials");
    expect(entry.provider).toBe("local");
    // The submitted secret must never appear in the audit trail.
    expect(JSON.stringify(entries)).not.toContain("wrongpassword");
  });

  test("a successful credentials sign-in emits auth.login.success with the user id", async () => {
    entries = [];
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db: new Database(":memory:") }),
      providers: [acceptingProvider],
    });

    const res = await auth.handleRequest(
      post("/api/auth/signin/local", "email=alice@x.dev&password=correct-horse"),
    );
    expect(res.status).toBe(302);

    const entry = entries.at(-1) as Entry;
    expect(entry.event).toBe("auth.login.success");
    expect(entry.userId).toBe("u_42");
    expect(entry.ip).toBe("203.0.113.99");
    expect(entry.provider).toBe("local");
    expect(typeof entry.sessionHash).toBe("string");
    expect(JSON.stringify(entries)).not.toContain("correct-horse");
  });

  test("sign-out emits auth.logout with the revoked session's user id", async () => {
    entries = [];
    const db = new Database(":memory:");
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      providers: [acceptingProvider],
    });

    const signedIn = await auth.handleRequest(
      post("/api/auth/signin/local", "username=alice&password=correct-horse"),
    );
    const cookie = extractCookie(signedIn, SESSION_COOKIE) as string;

    entries = [];
    const out = await auth.handleRequest(
      post("/api/auth/signout", undefined, { Cookie: `x_session=${cookie}` }),
    );
    expect(out.status).toBe(302);

    const entry = entries.at(-1) as Entry;
    expect(entry.event).toBe("auth.logout");
    expect(entry.userId).toBe("u_42");
    expect(entry.ip).toBe("203.0.113.99");
  });

  test("revokeAllForUser emits auth.session_revoked for that user", async () => {
    entries = [];
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db: new Database(":memory:") }),
      providers: [acceptingProvider],
    });

    await auth.revokeAllForUser("u_42");
    const entry = entries.at(-1) as Entry;
    expect(entry.event).toBe("auth.session_revoked");
    expect(entry.userId).toBe("u_42");
  });
});

describe("audit: RBAC permission denied", () => {
  test("a 403 from requireRole emits auth.permission_denied with the session user", async () => {
    entries = [];
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db: new Database(":memory:") }),
      providers: [acceptingProvider],
    });

    const signedIn = await auth.handleRequest(
      post("/api/auth/signin/local", "username=alice&password=correct-horse"),
    );
    const cookie = extractCookie(signedIn, SESSION_COOKIE) as string;

    const middleware = auth.requireRole("admin");
    entries = [];
    const res = await middleware(
      {
        params: {},
        request: new Request(`${BASE_URL}/admin`, {
          headers: { Cookie: `x_session=${cookie}` },
        }),
      },
      () => Promise.resolve(new Response("denied", { status: 403 })),
    );
    expect(res.status).toBe(403);

    const entry = entries.at(-1) as Entry;
    expect(entry.event).toBe("auth.permission_denied");
    expect(entry.userId).toBe("u_42");
    expect(entry.reason).toBe("Forbidden");
  });
});
