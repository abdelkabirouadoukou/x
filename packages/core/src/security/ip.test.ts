import { describe, expect, test } from "bun:test";
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
