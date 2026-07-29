/**
 * Lightweight in-memory rate limiter. Fixed-window counter keyed by client
 * IP by default. Good enough for a single-process Bun deployment or as a
 * first line of defense in front of brute-force/DDoS traffic; for multi-instance
 * deployments, front this with a shared store (Redis, etc.) via a custom `keyFn`
 * and store — this implementation intentionally has no external dependencies.
 */

export interface RateLimitOptions {
  /** Max requests allowed per window per key. Default: 60. */
  limit?: number;
  /** Window size in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
  /** Derives the rate-limit bucket key from a request. Default: client IP from standard headers. */
  keyFn?: (req: Request) => string;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

function defaultKeyFn(req: Request): string {
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}

/** Creates an independent rate limiter with its own bucket store. */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const limit = options.limit ?? 60;
  const windowMs = options.windowMs ?? 60_000;
  const keyFn = options.keyFn ?? defaultKeyFn;
  const buckets = new Map<string, Bucket>();

  function check(req: Request): RateLimitResult {
    const key = keyFn(req);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const ok = bucket.count <= limit;
    return { ok, limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
  }

  /** Periodically call to prevent unbounded growth of the bucket map. Safe to skip in tests. */
  function sweep(): void {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return { check, sweep, buckets };
}

/**
 * Convenience middleware-style handler: returns a 429 Response when the
 * limit is exceeded, or null when the request should proceed.
 */
export function rateLimitMiddleware(
  limiter: ReturnType<typeof createRateLimiter>,
  req: Request,
): Response | null {
  const result = limiter.check(req);
  if (result.ok) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return new Response("Too Many Requests", {
    status: 429,
    headers: {
      "Retry-After": String(retryAfterSeconds),
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
    },
  });
}
