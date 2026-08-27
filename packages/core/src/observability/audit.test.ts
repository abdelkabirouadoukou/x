import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { configureTrustedProxy, resetTrustedProxy } from "../security/trusted-proxy";
import {
  type AuditEntry,
  type AuditSink,
  audit,
  auditLoginFailure,
  auditLoginSuccess,
  auditLogout,
  auditPasswordChanged,
  auditPermissionDenied,
  auditRoleChanged,
  auditSessionRevoked,
  clientIpFromRequest,
  createConsoleAuditSink,
  getAuditSink,
  noopAuditSink,
  requestIdFromRequest,
  setAuditSink,
} from "./audit";

type CapturedEntry = [AuditEntry];

let captured: CapturedEntry = [] as unknown as CapturedEntry;

const capturingSink: AuditSink = {
  write(entry) {
    (captured as unknown as AuditEntry[]).push(entry);
  },
};

beforeAll(() => {
  setAuditSink(capturingSink);
});

afterAll(() => {
  setAuditSink(noopAuditSink);
});

function reset() {
  (captured as unknown as AuditEntry[]) = [];
}

describe("audit sink pluggability", () => {
  test("defaults to a no-op sink; setAuditSink installs a reporter", () => {
    expect(getAuditSink()).toBe(capturingSink);
    setAuditSink(noopAuditSink);
    expect(() =>
      audit({
        timestamp: new Date().toISOString(),
        event: "auth.login.failure",
        userId: null,
        ip: null,
      }),
    ).not.toThrow();
    setAuditSink(capturingSink);
  });

  test("createConsoleAuditSink emits one JSON line per event", () => {
    const lines: string[] = [];
    const sink = createConsoleAuditSink();
    const originalLog = console.log;
    console.log = (line: string) => {
      lines.push(line);
    };
    try {
      sink.write({ event: "auth.logout", userId: "u_1", ip: "1.2.3.4", timestamp: "when" });
    } finally {
      console.log = originalLog;
    }
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] as string).event).toBe("auth.logout");
  });
});

describe("audit event helpers", () => {
  test("every event carries userId-or-null, ip, and a timestamp", () => {
    reset();
    auditLoginFailure({ userId: null, ip: "203.0.113.9", reason: "invalid credentials" });
    auditLoginSuccess({ userId: "u_1", ip: "203.0.113.9", provider: "local" });
    auditLogout({ userId: "u_1", ip: null });
    auditPasswordChanged({ userId: "u_1", ip: null });
    auditRoleChanged({ userId: "u_1", ip: null });
    auditPermissionDenied({ userId: null, ip: "203.0.113.9", reason: "missing role admin" });
    auditSessionRevoked({ userId: "u_1", ip: null });

    const events = (captured as unknown as AuditEntry[]).map((e) => e.event);
    expect(events).toEqual([
      "auth.login.failure",
      "auth.login.success",
      "auth.logout",
      "auth.password_changed",
      "auth.role_changed",
      "auth.permission_denied",
      "auth.session_revoked",
    ]);
    for (const e of captured as unknown as AuditEntry[]) {
      expect(typeof e.timestamp).toBe("string");
      expect(e.userId === null || typeof e.userId === "string").toBe(true);
      expect(e.ip === null || typeof e.ip === "string").toBe(true);
    }
  });

  test("a login-failure entry carries reason; success entries may carry provider + sessionHash", () => {
    reset();
    auditLoginFailure({
      userId: null,
      ip: "198.51.100.7",
      requestId: "req-123",
      reason: "invalid credentials",
    });
    auditLoginSuccess({
      userId: "u_9",
      ip: "198.51.100.7",
      provider: "github",
      sessionHash: "hmac-digest",
    });

    const [failure, success] = captured as unknown as [AuditEntry, AuditEntry];
    expect(failure.reason).toBe("invalid credentials");
    expect(failure.userId).toBeNull();
    expect(failure.ip).toBe("198.51.100.7");
    expect(failure.requestId).toBe("req-123");
    expect(success.userId).toBe("u_9");
    expect(success.provider).toBe("github");
    expect(success.sessionHash).toBe("hmac-digest");
  });
});

describe("audit secret redaction", () => {
  test("sensitive metadata keys and embedded credentials never reach the sink", () => {
    reset();
    auditLoginFailure({
      userId: null,
      ip: "203.0.113.4",
      reason: "Authorization: Bearer hunter2 rejected for alice",
      metadata: {
        password: "hunter2",
        resetToken: "tok_abc123",
        email: "alice@x.dev",
      },
    });

    const entry = (captured as unknown as AuditEntry[])[0] as AuditEntry;
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("tok_abc123");
    expect(entry.metadata?.password).toBe("[REDACTED]");
    expect(entry.metadata?.resetToken).toBe("[REDACTED]");
    // Non-secret context survives.
    expect(entry.metadata?.email).toBe("alice@x.dev");
  });

  test("framework-provided reason strings are fixed and secret-free", () => {
    reset();
    for (const reason of [
      "invalid credentials",
      "rate limited (3 failed attempts)",
      "invalid state",
      "missing PKCE verifier",
    ]) {
      auditLoginFailure({ userId: null, ip: null, reason });
    }
    for (const e of captured as unknown as AuditEntry[]) {
      expect(e.reason).toMatch(/^[a-z0-9 ().-]+$/i);
    }
  });

  test("embedded bearer/authorization values in a reason are masked", () => {
    reset();
    auditLoginFailure({
      userId: null,
      ip: null,
      reason: "token rejected: Bearer eyJhbGciOiJIUzI1NiJ9",
    });
    const entry = (captured as unknown as AuditEntry[])[0] as AuditEntry;
    expect(JSON.stringify(entry)).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });
});

describe("request metadata helpers", () => {
  test("clientIpFromRequest returns null for all headers when trustForwardedHeaders is false (default)", () => {
    const forwarded = new Request("http://localhost/x", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.2" },
    });
    expect(clientIpFromRequest(forwarded)).toBeNull();

    const real = new Request("http://localhost/x", { headers: { "x-real-ip": "198.51.100.1" } });
    expect(clientIpFromRequest(real)).toBeNull();

    expect(clientIpFromRequest(new Request("http://localhost/x"))).toBeNull();
  });

  test("clientIpFromRequest trusts headers when trustForwardedHeaders is true", () => {
    configureTrustedProxy({ trustForwardedHeaders: true });
    try {
      const forwarded = new Request("http://localhost/x", {
        headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.2" },
      });
      expect(clientIpFromRequest(forwarded)).toBe("203.0.113.9");

      const real = new Request("http://localhost/x", { headers: { "x-real-ip": "198.51.100.1" } });
      expect(clientIpFromRequest(real)).toBe("198.51.100.1");

      expect(clientIpFromRequest(new Request("http://localhost/x"))).toBeNull();
    } finally {
      resetTrustedProxy();
    }
  });

  test("requestIdFromRequest reads the correlation header if present", () => {
    const withId = new Request("http://localhost/x", { headers: { "x-request-id": "abc" } });
    expect(requestIdFromRequest(withId)).toBe("abc");
    expect(requestIdFromRequest(new Request("http://localhost/x"))).toBeUndefined();
  });

  test("requestIdFromRequest rejects IDs that fail the format check", () => {
    // Too long (>128 chars)
    const longId = "a".repeat(129);
    expect(
      requestIdFromRequest(
        new Request("http://localhost/x", { headers: { "x-request-id": longId } }),
      ),
    ).toBeUndefined();

    // Contains spaces
    expect(
      requestIdFromRequest(
        new Request("http://localhost/x", { headers: { "x-request-id": "has spaces" } }),
      ),
    ).toBeUndefined();

    // Contains angle brackets (potential injection)
    expect(
      requestIdFromRequest(
        new Request("http://localhost/x", { headers: { "x-request-id": "<script>" } }),
      ),
    ).toBeUndefined();
  });

  test("requestIdFromRequest accepts valid IDs", () => {
    // UUID-style
    expect(
      requestIdFromRequest(
        new Request("http://localhost/x", {
          headers: { "x-request-id": "550e8400-e29b-41d4-a716-446655440000" },
        }),
      ),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");

    // Alphanumeric with hyphens and underscores, up to 128 chars
    const validId = "a".repeat(128);
    expect(
      requestIdFromRequest(
        new Request("http://localhost/x", { headers: { "x-request-id": validId } }),
      ),
    ).toBe(validId);

    expect(
      requestIdFromRequest(
        new Request("http://localhost/x", { headers: { "x-request-id": "req-123_abc" } }),
      ),
    ).toBe("req-123_abc");
  });
});
