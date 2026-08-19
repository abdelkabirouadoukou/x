/**
 * Per-account brute-force guard for credentials sign-in.
 *
 * The framework's general-purpose rate limiter is IP-keyed and shared across
 * the whole app, so a distributed attack (many IPs, one account) or a shared
 * NAT/office IP walks right past it. This guard is scoped tighter than that:
 * the bucket key is `(client IP, submitted identifier)`, so N consecutive
 * failed attempts against one account lock *that account* regardless of how
 * many IPs are doing the guessing, without throttling legitimate traffic to
 * other accounts from the same network.
 *
 * In-memory (single-process) by default, with exponential backoff: each
 * failure extends the lockout window (`windowMs * 2^(failures-1)`, capped),
 * so sustained guessing is pushed out rather than just rate-sampled.
 */

export interface BruteForceOptions {
  /** Consecutive failed attempts per account before it locks. Default: 5. */
  maxAttempts?: number;
  /** Base lockout window in ms; each failure extends it (exponential backoff). Default: 15 min. */
  windowMs?: number;
}

export interface AttemptResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  failures: number;
  resetAt: number;
}

export function createBruteForceGuard(options: BruteForceOptions = {}) {
  const maxAttempts = options.maxAttempts ?? 5;
  const windowMs = options.windowMs ?? 15 * 60_000;
  const buckets = new Map<string, Bucket>();

  function clientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
    return req.headers.get("x-real-ip") ?? "unknown";
  }

  function keyFor(req: Request, identifier: string): string {
    return `login:${clientIp(req)}:${identifier}`;
  }

  /** Current lockout state for `key`, without recording anything. */
  function status(key: string, now = Date.now()): AttemptResult {
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      return { ok: true, remaining: maxAttempts, resetAt: now };
    }
    return {
      ok: bucket.failures < maxAttempts,
      remaining: Math.max(0, maxAttempts - bucket.failures),
      resetAt: bucket.resetAt,
    };
  }

  /** Records a failed attempt, extending the lockout via exponential backoff. */
  function recordFailure(key: string, now = Date.now()): AttemptResult {
    const existing = buckets.get(key);
    if (existing && existing.resetAt > now) {
      const failures = existing.failures + 1;
      const backoff = Math.min(windowMs * 2 ** (failures - 1), windowMs * 32);
      const resetAt = now + backoff;
      buckets.set(key, { failures, resetAt });
      return {
        ok: failures < maxAttempts,
        remaining: Math.max(0, maxAttempts - failures),
        resetAt,
      };
    }
    const resetAt = now + windowMs;
    buckets.set(key, { failures: 1, resetAt });
    return { ok: maxAttempts > 1, remaining: maxAttempts - 1, resetAt };
  }

  /** Clears the bucket for `key` after a successful sign-in. */
  function reset(key: string): void {
    buckets.delete(key);
  }

  function sweep(): void {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  // Don't keep the process (or a test run) alive just for sweeping.
  const timer = setInterval(sweep, Math.max(windowMs, 1000));
  timer.unref?.();

  return {
    keyFor,
    status,
    recordFailure,
    reset,
    buckets,
    dispose: () => clearInterval(timer),
  };
}

export type BruteForceGuard = ReturnType<typeof createBruteForceGuard>;
