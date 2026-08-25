import { describe, expect, test } from "bun:test";
import { clientIpFromRequest as auditReExport } from "../observability/audit";
import { clientIpFromRequest } from "./ip";

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/test", { headers });
}

describe("clientIpFromRequest", () => {
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
  test("re-export behaves identically to the direct import", () => {
    const r1 = req({ "x-forwarded-for": "10.0.0.1" });
    expect(auditReExport(r1)).toBe(clientIpFromRequest(r1));

    const r2 = req({ "x-real-ip": "10.0.0.2" });
    expect(auditReExport(r2)).toBe(clientIpFromRequest(r2));

    const r3 = req();
    expect(auditReExport(r3)).toBe(clientIpFromRequest(r3));
  });
});
