/**
 * Per-account brute-force guard for credentials sign-in.
 *
 * The framework's general-purpose rate limiter is IP-keyed and shared across
 * the whole app, so a distributed attack (many IPs, one account) or a shared
 * NAT/office IP walks right past it. This guard is scoped tighter than that:
 * two *independent* buckets are checked together —
 *
 * - **Account bucket** (keyed by the submitted identifier alone): N
 *   consecutive failed attempts against one account lock *that account*
 *   regardless of how many IPs are doing the guessing.
 * - **IP bucket** (keyed by the client IP alone): a single IP spraying many
 *   accounts is throttled without locking out any one account for everyone
 *   who shares that network.
 *
 * They are separate keys deliberately: a composite `(IP, account)` key gives
 * neither protection — an attacker rotating source IPs starts a fresh bucket
 * on every attempt, so no bucket ever accumulates toward `maxAttempts`.
 *
 * In-memory (single-process) by default, with exponential backoff: each
 * failure extends the lockout window (`windowMs * 2^(failures-1)`, capped),
 * so sustained guessing is pushed out rather than just rate-sampled.
 */

import { clientIpFromRequest } from "@thexjs/core";

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

  /**
   * In-flight reservations. `reserve` bumps this counter synchronously before
   * `await authorize(...)`, so N concurrent requests can't all pass the lockout
   * check before any commits a failure (the TOCTOU in #168). Each reserved
   * slot is released either on success (rollback) or after being converted to a
   * real failure.
   */
  const inflight = new Map<string, number>();

  /** Client IP, or null when neither proxy header is present. */
  function clientIp(req: Request): string | null {
    return clientIpFromRequest(req);
  }

  /**
   * Account-scoped bucket key: the submitted identifier alone. Namespaced
   * separately from the IP bucket so a crafted identifier that happens to look
   * like an IP (or vice versa) can't merge the two buckets.
   */
  function accountKey(identifier: string): string {
    return `login:account:${identifier}`;
  }

  /**
   * IP-scoped bucket key: the client IP alone (one IP spraying many accounts),
   * or null when the client IP can't be determined — see {@link clientIp}.
   */
  function ipKey(req: Request): string | null {
    const ip = clientIp(req);
    return ip === null ? null : `login:ip:${ip}`;
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

  /**
   * Synchronously reserves an attempt slot for `key` (no `await` between the
   * capacity check and the bump). Parallel callers that all clear the persisted
   * lockout are still gated: the in-flight counter caps how many may proceed
   * before any of them commits a failure. Returns `ok: false` immediately when
   * at capacity so the caller can respond 429 with no authorization work.
   */
  function reserve(key: string, now = Date.now()): AttemptResult {
    const s = status(key, now);
    if (!s.ok) return s;
    const count = inflight.get(key) ?? 0;
    if (count >= maxAttempts) {
      return { ok: false, remaining: maxAttempts - count, resetAt: s.resetAt };
    }
    inflight.set(key, count + 1);
    return { ok: true, remaining: maxAttempts - (count + 1), resetAt: s.resetAt };
  }

  /** Releases a reservation (rollback on success, or after it became a failure). */
  function release(key: string): void {
    const count = inflight.get(key) ?? 0;
    if (count <= 1) inflight.delete(key);
    else inflight.set(key, count - 1);
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
    accountKey,
    ipKey,
    status,
    reserve,
    release,
    recordFailure,
    reset,
    buckets,
    dispose: () => clearInterval(timer),
  };
}

export type BruteForceGuard = ReturnType<typeof createBruteForceGuard>;
