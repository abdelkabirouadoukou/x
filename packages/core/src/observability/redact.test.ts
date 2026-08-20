import { afterEach, describe, expect, test } from "bun:test";
import { logger, withRequestLogging } from "./logger";
import { isSensitiveKey, REDACTED, redactString, redactValue } from "./redact";

/**
 * Regression tests for log redaction (the redaction half of #79).
 *
 * Before this file existed, `write()` serialized caller fields straight into
 * the JSON log line and echoed caught-error messages verbatim, so any
 * `{ password }` field, or a driver/app error whose message embeds a token,
 * leaked into the log sink unchanged.
 */

function capture(method: "log" | "warn" | "error") {
  const lines: string[] = [];
  const original = console[method];
  console[method] = (line: string) => {
    lines.push(String(line));
  };
  return {
    lines,
    restore() {
      console[method] = original;
    },
  };
}

describe("isSensitiveKey", () => {
  test("matches secret-shaped key names case-insensitively", () => {
    expect(isSensitiveKey("password")).toBe(true);
    expect(isSensitiveKey("PASSWORD")).toBe(true);
    expect(isSensitiveKey("user_password")).toBe(true);
    expect(isSensitiveKey("accessToken")).toBe(true);
    expect(isSensitiveKey("cookie")).toBe(true);
    expect(isSensitiveKey("apiKey")).toBe(true);
    expect(isSensitiveKey("session_id")).toBe(true);
    expect(isSensitiveKey("title")).toBe(false);
    expect(isSensitiveKey("path")).toBe(false);
    expect(isSensitiveKey("status")).toBe(false);
  });
});

describe("redactString", () => {
  test("masks a Bearer token inline", () => {
    const out = redactString("request failed: Bearer eyJhbGciOiJIUzI1NiJ9.value");
    expect(out).toContain("Bearer " + REDACTED);
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });

  test("masks an Authorization header value", () => {
    const out = redactString("auth: Authorization: Basic dXNlcjpwYXNz");
    expect(out).not.toContain("dXNlcjpwYXNz");
    expect(out).toContain(REDACTED);
  });

  test("replaces Authorization/auth values exactly, no literal `$1` (regression for #9)", () => {
    // The old regex used a non-capturing `(?:authorization|auth)` group but the
    // replacement still referenced `$1`, so output contained the literal text
    // "$1 [REDACTED]". The group must capture so the keyword survives.
    expect(redactString("Authorization: fhqwhgads")).toBe(`Authorization ${REDACTED}`);
    expect(redactString("authorization: fhqwhgads")).toBe(`authorization ${REDACTED}`);
    expect(redactString("auth: fhqwhgads")).toBe(`auth ${REDACTED}`);
    expect(redactString("auth=fhqwhgads")).toBe(`auth ${REDACTED}`);
    expect(redactString("Authorization: fhqwhgads")).not.toContain("$1");
    expect(redactString("Authorization: fhqwhgads")).not.toContain("fhqwhgads");
  });

  test("masks a connection-string password (regression for #136)", () => {
    const out = redactString(
      "failed to connect: postgres://deploy:supersecret@db.internal:5432/app",
    );
    expect(out).toBe("failed to connect: postgres://deploy:[REDACTED]@db.internal:5432/app");
    expect(out).not.toContain("supersecret");
  });

  test("masks the userinfo password across URI schemes, keeping scheme/host", () => {
    const out = redactString(
      "mysql://alice:hunter2@db:3306/app, redis://:pw@cache:6379, dial tcp https://user:token@auth/api",
    );
    expect(out).toEqual(
      "mysql://alice:[REDACTED]@db:3306/app, redis://:[REDACTED]@cache:6379, dial tcp https://user:[REDACTED]@auth/api",
    );
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("pw");
    expect(out).not.toContain("token");
  });

  test("leaves userinfo without a password untouched", () => {
    const out = redactString("postgres://readonly@db/app");
    expect(out).toBe("postgres://readonly@db/app");
  });
});

describe("redactValue", () => {
  test("redacts a top-level field named like a secret", () => {
    const out = redactValue({ password: "hunter2", status: 200 }) as Record<string, unknown>;
    expect(out.password).toBe(REDACTED);
    expect(out.status).toBe(200);
  });

  test("redacts a nested key inside an object tree", () => {
    const out = redactValue({
      db: { connection: { user: "admin", password: "s3cret" }, pool: 4 },
      requestId: "req-1",
      meta: { token: { access: "abc", kind: "bearer" } },
    }) as Record<string, unknown>;
    const db = out.db as { connection: Record<string, unknown>; pool: number };
    expect(db.connection.password).toBe(REDACTED);
    expect(db.connection.user).toBe("admin");
    expect(db.pool).toBe(4);
    expect(out.requestId).toBe("req-1");
    // The token object under `meta` is redacted; `meta` itself keeps its shape.
    const meta = out.meta as Record<string, unknown>;
    expect(meta.token).toBe(REDACTED);
  });

  test("redacts a secret value nested under a non-sensitive key", () => {
    const out = redactValue({
      headers: { authorization: "Bearer abc.def", "x-request-id": "req-1" },
    }) as { headers: Record<string, unknown> };
    expect(out.headers.authorization).toBe(REDACTED);
    expect(out.headers["x-request-id"]).toBe("req-1");
  });

  test("redacts secret-shaped values inside arrays", () => {
    const out = redactValue({ items: [{ name: "a", token: "x" }, { name: "b" }] }) as {
      items: Array<Record<string, unknown>>;
    };
    expect(out.items[0]?.token).toBe(REDACTED);
    expect(out.items[0]?.name).toBe("a");
    expect(out.items[1]?.name).toBe("b");
  });

  test("redacts a connection string embedded in an error message value (regression for #136)", () => {
    const out = redactValue({
      error: "connect ECONNREFUSED postgres://admin:hush@db:5432/prod",
    }) as { error: string };
    expect(out.error).toBe("connect ECONNREFUSED postgres://admin:[REDACTED]@db:5432/prod");
    expect(out.error).not.toContain("hush");
  });

  test("leaves numbers, booleans and null untouched", () => {
    expect(redactValue(42)).toBe(42);
    expect(redactValue(null)).toBeNull();
    expect(redactValue(true)).toBe(true);
  });
});

describe("logger redaction on write", () => {
  afterEach(() => {
    // restore may be undefined in the non-error paths; nothing to reset here.
  });

  test("a top-level sensitive field is redacted in the emitted line", () => {
    const captureLog = capture("log");
    logger.info("sign in", { user: "alice", password: "hunter2", status: "ok" });
    captureLog.restore();

    const line = captureLog.lines[0];
    expect(line).toContain('"password":"' + REDACTED + '"');
    expect(line).not.toContain("hunter2");
    expect(line).toContain('"user":"alice"');
  });

  test("a nested token inside fields is redacted in the emitted line", () => {
    const captureLog = capture("log");
    logger.info("request ok", { db: { user: "admin", password: "s3cret" } });
    captureLog.restore();

    const line = captureLog.lines[0];
    expect(line).not.toContain("s3cret");
    expect(line).toContain(REDACTED);
    expect(line).toContain('"user":"admin"');
  });

  test("an error field containing a bearer token is redacted via withRequestLogging", async () => {
    const captureError = capture("error");
    const handler = withRequestLogging(async () => {
      throw new Error("failed to reach API with Bearer eyJhbGciOiJIUzI1NiJ9 token");
    });
    await expect(handler(new Request("https://example.com/dashboard"))).rejects.toThrow();
    captureError.restore();

    const line = captureError.lines[0];
    expect(line).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(line).toContain(REDACTED);
  });
});
