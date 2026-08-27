/**
 * Global setting that controls whether client-supplied forwarding headers
 * (`X-Forwarded-For`, `X-Real-IP`) are trusted for IP resolution.
 *
 * ## Security boundary
 *
 * When `trustForwardedHeaders` is **false** (the default), the framework
 * ignores `X-Forwarded-For` and `X-Real-IP` entirely. A client can set
 * these headers to arbitrary values on every request, which — if trusted —
 * lets them defeat IP-based rate limiting (brute-force guards) and poison
 * audit trails with attacker-chosen IPs. This is the safe default because
 * the framework cannot distinguish a legitimate proxy chain from a direct
 * connection with spoofed headers.
 *
 * Only set `trustForwardedHeaders: true` when **all** of the following hold:
 *  1. The application sits behind a reverse proxy / edge that scrubs or
 *     overwrites forwarded headers (e.g. Vercel Edge, Cloudflare, AWS ALB).
 *  2. The proxy always sets `X-Forwarded-For` to the real client IP chain,
 *     and clients cannot reach the origin without going through that proxy.
 *
 * Adapters (e.g. `@thexjs/adapter-vercel`) call {@link configureTrustedProxy}
 * at their own initialization point when the deployment platform guarantees
 * header integrity. Applications that deploy directly (no proxy) or sit
 * behind a proxy that does not scrub headers must **not** enable this.
 */

export interface TrustedProxyOptions {
  /**
   * When `true`, `clientIpFromRequest()` reads `X-Forwarded-For` /
   * `X-Real-IP` headers. When `false` (default), those headers are ignored
   * and `clientIpFromRequest()` returns `null` (unavailable).
   */
  trustForwardedHeaders?: boolean;
}

let trustForwardedHeaders = false;

/**
 * Returns `true` when the application has opted in to trusting client-supplied
 * forwarding headers for IP resolution.
 */
export function isTrustedProxy(): boolean {
  return trustForwardedHeaders;
}

/**
 * Configures the global trusted-proxy policy. Call once at application
 * initialization (e.g. inside an adapter's build output or a top-level
 * `x.config.ts` callback). Subsequent calls overwrite the previous value.
 *
 * @example
 * ```ts
 * // Vercel adapter — edge always sets X-Forwarded-For correctly
 * configureTrustedProxy({ trustForwardedHeaders: true });
 * ```
 */
export function configureTrustedProxy(options: TrustedProxyOptions): void {
  trustForwardedHeaders = options.trustForwardedHeaders ?? false;
}

/**
 * Resets the trusted-proxy setting to the default (`false`).
 * Exported for test isolation — production code should never need this.
 */
export function resetTrustedProxy(): void {
  trustForwardedHeaders = false;
}
