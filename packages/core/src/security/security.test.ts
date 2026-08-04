import { describe, expect, test } from "bun:test";
import { checkCsrf, generateCsrfToken, verifyCsrfToken, verifyOrigin } from "./csrf";
import { EnvLeakageError, assertNoEnvLeakage, findLeakedEnvKeys } from "./env-isolation";
import { applySecurityHeaders, buildSecurityHeaders } from "./headers";
import { createRateLimiter, rateLimitMiddleware } from "./rate-limit";

describe("csrf: verifyOrigin", () => {
  test("allows safe methods without any Origin/Referer header", () => {
    const req = new Request("https://example.com/__x/actions/foo/bar", { method: "GET" });
    expect(verifyOrigin(req).ok).toBe(true);
  });

  test("allows a POST whose Origin matches the request's own origin", () => {
    const req = new Request("https://example.com/__x/actions/foo/bar", {
      method: "POST",
      headers: { origin: "https://example.com" },
    });
    expect(verifyOrigin(req).ok).toBe(true);
  });

  test("allows a POST whose Origin is in the explicit allow-list", () => {
    const req = new Request("https://example.com/__x/actions/foo/bar", {
      method: "POST",
      headers: { origin: "https://app.example.com" },
    });
    expect(verifyOrigin(req, ["https://app.example.com"]).ok).toBe(true);
  });

  test("rejects a cross-site POST with a mismatched Origin", () => {
    const req = new Request("https://example.com/__x/actions/foo/bar", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    const result = verifyOrigin(req);
    expect(result.ok).toBe(false);
  });

  test("rejects a POST with neither Origin nor Referer", () => {
    const req = new Request("https://example.com/__x/actions/foo/bar", { method: "POST" });
    expect(verifyOrigin(req).ok).toBe(false);
  });

  test("falls back to Referer when Origin is absent", () => {
    const req = new Request("https://example.com/__x/actions/foo/bar", {
      method: "POST",
      headers: { referer: "https://example.com/dashboard" },
    });
    expect(verifyOrigin(req).ok).toBe(true);
  });
});

describe("csrf: double-submit token", () => {
  test("rejects when cookie and header are both missing", () => {
    const req = new Request("https://example.com/x", { method: "POST" });
    expect(verifyCsrfToken(req).ok).toBe(false);
  });

  test("rejects when cookie and header mismatch", () => {
    const req = new Request("https://example.com/x", {
      method: "POST",
      headers: { cookie: "x_csrf_token=abc", "x-csrf-token": "def" },
    });
    expect(verifyCsrfToken(req).ok).toBe(false);
  });

  test("accepts when cookie and header match", () => {
    const token = generateCsrfToken();
    const req = new Request("https://example.com/x", {
      method: "POST",
      headers: { cookie: `x_csrf_token=${token}`, "x-csrf-token": token },
    });
    expect(verifyCsrfToken(req).ok).toBe(true);
  });
});

describe("csrf: checkCsrf", () => {
  test("disabled option bypasses all checks", () => {
    const req = new Request("https://example.com/x", { method: "POST" });
    expect(checkCsrf(req, { disabled: true }).ok).toBe(true);
  });

  test("requireToken adds the double-submit check on top of origin checks", () => {
    const req = new Request("https://example.com/x", {
      method: "POST",
      headers: { origin: "https://example.com" },
    });
    expect(checkCsrf(req, { requireToken: true }).ok).toBe(false);
  });
});

describe("security headers", () => {
  test("sets conservative defaults", () => {
    const headers = buildSecurityHeaders();
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.has("Content-Security-Policy")).toBe(true);
    expect(headers.has("Strict-Transport-Security")).toBe(true);
  });

  test("individual headers can be disabled", () => {
    const headers = buildSecurityHeaders({ frameOptions: false, hstsMaxAge: false });
    expect(headers.has("X-Frame-Options")).toBe(false);
    expect(headers.has("Strict-Transport-Security")).toBe(false);
  });

  test("applySecurityHeaders merges onto an existing response without clobbering it", () => {
    const original = new Response("hi", { headers: { "Content-Type": "text/plain" } });
    const hardened = applySecurityHeaders(original);
    expect(hardened.headers.get("Content-Type")).toBe("text/plain");
    expect(hardened.headers.get("X-Frame-Options")).toBe("DENY");
  });
});

describe("rate limiting", () => {
  test("allows requests under the limit and blocks once exceeded", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, keyFn: () => "same-key" });
    const req = new Request("https://example.com/x");

    expect(await rateLimitMiddleware(limiter, req)).toBeNull();
    expect(await rateLimitMiddleware(limiter, req)).toBeNull();
    const blocked = await rateLimitMiddleware(limiter, req);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });

  test("separate keys get independent buckets", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const reqA = new Request("https://example.com/x", {
      headers: { "x-forwarded-for": "1.1.1.1" },
    });
    const reqB = new Request("https://example.com/x", {
      headers: { "x-forwarded-for": "2.2.2.2" },
    });

    expect(await rateLimitMiddleware(limiter, reqA)).toBeNull();
    expect(await rateLimitMiddleware(limiter, reqB)).toBeNull();
    expect(await rateLimitMiddleware(limiter, reqA)).not.toBeNull();
  });

  test("resolves the client key from the socket IP before header fallbacks", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    // No proxy headers at all, but the Bun server reports a real peer address.
    const req = new Request("https://example.com/x");
    const server = {
      requestIP: () => ({ address: "203.0.113.7" }),
    };

    expect(await rateLimitMiddleware(limiter, req, server)).toBeNull();
    expect(await rateLimitMiddleware(limiter, req, server)).not.toBeNull();
    limiter.dispose();
  });

  test("without a socket IP or proxy headers, requests do not share one global bucket", async () => {
    // Two requests with no IP information must still not collapse into a
    // single shared bucket that breaks every client at once: the fallback
    // keys off something request-specific, so each gets its own bucket.
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const reqA = new Request("https://example.com/x", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    const reqB = new Request("https://example.com/x", {
      headers: { "x-real-ip": "10.0.0.2" },
    });

    expect(await rateLimitMiddleware(limiter, reqA)).toBeNull();
    expect(await rateLimitMiddleware(limiter, reqB)).toBeNull();
    expect(await rateLimitMiddleware(limiter, reqA)).not.toBeNull();
    limiter.dispose();
  });

  test("429 responses carry a text content type and Retry-After", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const req = new Request("https://example.com/x");

    expect(await rateLimitMiddleware(limiter, req)).toBeNull();
    const blocked = await rateLimitMiddleware(limiter, req);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Content-Type")).toContain("text/plain");
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
    limiter.dispose();
  });

  test("sweep() removes expired buckets and dispose() stops the timer", async () => {
    const limiter = createRateLimiter({
      limit: 5,
      windowMs: 10,
      keyFn: () => "sweep-key",
    });
    await limiter.check(new Request("https://example.com/x"));
    expect(limiter.buckets.size).toBe(1);

    await new Promise((r) => setTimeout(r, 20));
    limiter.sweep();
    expect(limiter.buckets.size).toBe(0);
    limiter.dispose();
  });

  test("works with a shared store (backed by an in-memory RateLimitStore)", async () => {
    const counts = new Map<string, { count: number; resetAt: number }>();
    const store: import("./rate-limit").RateLimitStore = {
      async incr(key, windowMs) {
        const now = Date.now();
        const current = counts.get(key);
        const count = current && current.resetAt > now ? current.count + 1 : 1;
        const bucket = { count, resetAt: now + windowMs };
        counts.set(key, bucket);
        return bucket;
      },
    };

    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, store });
    const req = new Request("https://example.com/x", {
      headers: { "x-forwarded-for": "9.9.9.9" },
    });

    expect(await rateLimitMiddleware(limiter, req)).toBeNull();
    expect(await rateLimitMiddleware(limiter, req)).not.toBeNull();
    limiter.dispose();
  });
});

describe("env isolation", () => {
  test("flags a server-only process.env access", () => {
    const code = 'const key = process.env.STRIPE_SECRET_KEY;\nfetch("/x", { headers: { key } });';
    expect(findLeakedEnvKeys(code)).toEqual(["STRIPE_SECRET_KEY"]);
  });

  test("allows THEXJS_PUBLIC_-prefixed variables", () => {
    const code = "const url = process.env.THEXJS_PUBLIC_API_URL;";
    expect(findLeakedEnvKeys(code)).toEqual([]);
  });

  test("catches Bun.env and import.meta.env access too", () => {
    const code = "const a = Bun.env.DATABASE_URL;\nconst b = import.meta.env.SECRET;";
    expect(findLeakedEnvKeys(code).sort()).toEqual(["DATABASE_URL", "SECRET"]);
  });

  test("catches import.meta.env bracket access", () => {
    const code = 'const url = import.meta.env["API_SECRET"];';
    expect(findLeakedEnvKeys(code)).toEqual(["API_SECRET"]);
  });

  test("flags dynamic, concatenated, and aliased env access", () => {
    expect(findLeakedEnvKeys("const k = process.env[variable];")).toContain(
      "process.env (dynamic env key access)",
    );
    expect(findLeakedEnvKeys('const k = process.env["ST" + "RIPE"];')).toContain(
      "process.env (concatenated env key access)",
    );
    expect(findLeakedEnvKeys("const e = process.env; e.KEY;")).toContain(
      "process.env (bare process.env access (aliasing/mutation))",
    );
  });

  test("assertNoEnvLeakage throws EnvLeakageError with the offending file and keys", () => {
    const code = "const key = process.env.STRIPE_SECRET_KEY;";
    expect(() => assertNoEnvLeakage(code, "dist/client/_islands/foo.js")).toThrow(EnvLeakageError);
  });

  test("assertNoEnvLeakage is a no-op for clean code", () => {
    const code = "const url = process.env.THEXJS_PUBLIC_API_URL;";
    expect(() => assertNoEnvLeakage(code, "dist/client/_islands/foo.js")).not.toThrow();
  });
});
