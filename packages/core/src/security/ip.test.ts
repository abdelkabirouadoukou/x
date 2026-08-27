import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { clientIpFromRequest as auditReExport } from "../observability/audit";
import { clientIpFromRequest } from "./ip";
import { configureTrustedProxy, resetTrustedProxy } from "./trusted-proxy";

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/test", { headers });
}

beforeEach(() => {
  resetTrustedProxy();
});

afterAll(() => {
  resetTrustedProxy();
});

describe("clientIpFromRequest (default: trustForwardedHeaders = false)", () => {
  test("returns null for X-Forwarded-For when not trusted", () => {
    expect(clientIpFromRequest(req({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
  });

  test("returns null for X-Real-IP when not trusted", () => {
    expect(clientIpFromRequest(req({ "x-real-ip": "9.9.9.9" }))).toBeNull();
  });

  test("returns null when no proxy headers are present", () => {
    expect(clientIpFromRequest(req())).toBeNull();
  });

  test("returns null even with multiple forwarded entries", () => {
    expect(clientIpFromRequest(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBeNull();
  });
});

describe("clientIpFromRequest (trustForwardedHeaders = true)", () => {
  beforeEach(() => {
    configureTrustedProxy({ trustForwardedHeaders: true });
  });

  test("returns the first X-Forwarded-For entry", () => {
    expect(clientIpFromRequest(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");
  });

  test("picks the leftmost entry from a comma-separated chain", () => {
    expect(clientIpFromRequest(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  test("falls back to X-Real-IP when X-Forwarded-For is absent", () => {
    expect(clientIpFromRequest(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  test("returns null when neither proxy header is present", () => {
    expect(clientIpFromRequest(req())).toBeNull();
  });

  test("returns null for an empty/whitespace-only forwarded value", () => {
    expect(clientIpFromRequest(req({ "x-forwarded-for": " , " }))).toBeNull();
  });
});

describe("audit.ts re-export", () => {
  test("re-export behaves identically to the direct import (untrusted)", () => {
    resetTrustedProxy();
    const r1 = req({ "x-forwarded-for": "10.0.0.1" });
    expect(auditReExport(r1)).toBe(clientIpFromRequest(r1));

    const r2 = req({ "x-real-ip": "10.0.0.2" });
    expect(auditReExport(r2)).toBe(clientIpFromRequest(r2));

    const r3 = req();
    expect(auditReExport(r3)).toBe(clientIpFromRequest(r3));
  });

  test("re-export behaves identically to the direct import (trusted)", () => {
    configureTrustedProxy({ trustForwardedHeaders: true });
    const r1 = req({ "x-forwarded-for": "10.0.0.1" });
    expect(auditReExport(r1)).toBe(clientIpFromRequest(r1));

    const r2 = req({ "x-real-ip": "10.0.0.2" });
    expect(auditReExport(r2)).toBe(clientIpFromRequest(r2));

    const r3 = req();
    expect(auditReExport(r3)).toBe(clientIpFromRequest(r3));
  });
});

describe("configureTrustedProxy", () => {
  test("defaults to false", () => {
    expect(clientIpFromRequest(req({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
  });

  test("can be enabled and disabled", () => {
    configureTrustedProxy({ trustForwardedHeaders: true });
    expect(clientIpFromRequest(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");

    configureTrustedProxy({ trustForwardedHeaders: false });
    expect(clientIpFromRequest(req({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
  });

  test("resetTrustedProxy restores the default", () => {
    configureTrustedProxy({ trustForwardedHeaders: true });
    expect(clientIpFromRequest(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");

    resetTrustedProxy();
    expect(clientIpFromRequest(req({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
  });
});
