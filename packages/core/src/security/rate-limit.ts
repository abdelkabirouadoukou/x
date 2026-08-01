/**
 * Lightweight fixed-window rate limiter. In-memory by default, keyed by client
 * IP — good enough for a single-process Bun deployment or as a first line of
 * defense in front of brute-force/DDoS traffic. For multi-instance deployments
 * (K8s, multiple replicas) pass a shared `store` (see `createRedisRateLimitStore`)
 * so limits are enforced across processes. This implementation has no external
 * dependencies: the Redis store lazy-imports Bun's built-in `bun:redis` only
 * when it's actually used.
 */

import { createRequire } from "node:module";

export interface RateLimitOptions {
  /** Max requests allowed per window per key. Default: 60. */
  limit?: number;
  /** Window size in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
  /** Derives the rate-limit bucket key from a request. Default: client IP from standard headers. */
  keyFn?: (req: Request) => string;
  /** Optional shared store (e.g. Redis) for multi-instance deployments. */
  store?: RateLimitStore;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * A shared backend for rate-limit counters. Implementations must atomically
 * increment the counter for `key` (creating a fresh window of `windowMs`
 * when the key is new) and return the new count plus when the window resets.
 */
export interface RateLimitStore {
  incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
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
  const store = options.store;
  const buckets = new Map<string, Bucket>();

  async function check(req: Request): Promise<RateLimitResult> {
    const key = keyFn(req);
    if (store) {
      const { count, resetAt } = await store.incr(key, windowMs);
      return { ok: count <= limit, limit, remaining: Math.max(0, limit - count), resetAt };
    }

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

  /**
   * Drops expired buckets from the in-memory map. Runs automatically on an
   * interval once per window (no-op when a shared store is used); call
   * `dispose()` to stop it, e.g. when tearing down in tests.
   */
  function sweep(): void {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  const timer = setInterval(sweep, Math.max(windowMs, 1000));
  // Don't keep the process (or a test run) alive just for sweeping.
  timer.unref?.();

  return { check, sweep, buckets, dispose: () => clearInterval(timer) };
}

/**
 * Convenience middleware-style handler: returns a 429 Response when the
 * limit is exceeded, or null when the request should proceed.
 */
export async function rateLimitMiddleware(
  limiter: ReturnType<typeof createRateLimiter>,
  req: Request,
): Promise<Response | null> {
  const result = await limiter.check(req);
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

/**
 * Shared rate-limit store backed by Redis, so limits are enforced across
 * multiple server instances. Uses Bun's built-in `bun:redis` (no npm
 * dependency) and connects lazily on first use. Pass the result as
 * `store` in `createRateLimiter`/`security.rateLimit`.
 */
export function createRedisRateLimitStore(options: { url?: string } = {}): RateLimitStore {
  type RedisClientLike = { sendCommand(...args: string[]): Promise<unknown> };
  let client: RedisClientLike | null = null;
  let connecting: Promise<RedisClientLike> | null = null;

  async function connect(): Promise<RedisClientLike> {
    // Loaded lazily through require() (like bun:sqlite) so this module still
    // type-checks and loads on runtimes where bun:redis isn't available —
    // the failure only surfaces if someone actually uses the Redis store.
    const require = createRequire(import.meta.url);
    const mod = require("bun:redis") as {
      RedisClient: new (opts?: { url?: string }) => {
        connect(): Promise<unknown>;
        sendCommand(...args: string[]): Promise<unknown>;
      };
    };
    const instance = options.url
      ? new mod.RedisClient({ url: options.url })
      : new mod.RedisClient();
    await instance.connect();
    return instance;
  }

  function getClient(): Promise<RedisClientLike> {
    if (client) return Promise.resolve(client);
    if (!connecting) {
      connecting = connect().then((c) => {
        client = c;
        return c;
      });
    }
    return connecting;
  }

  return {
    async incr(key, windowMs) {
      const c = await getClient();
      const redisKey = `x:ratelimit:${key}`;
      const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      const count = Number(await c.sendCommand("INCR", redisKey));
      if (count === 1) {
        await c.sendCommand("EXPIRE", redisKey, String(ttlSeconds));
      }
      return { count, resetAt: Date.now() + windowMs };
    },
  };
}
