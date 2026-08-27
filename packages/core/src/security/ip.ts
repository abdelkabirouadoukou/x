import { isTrustedProxy } from "./trusted-proxy";

/**
 * Returns the client IP from a request.
 *
 * When the application has opted in to trusting forwarded headers (via
 * `configureTrustedProxy({ trustForwardedHeaders: true })`), this function
 * checks `X-Forwarded-For` first (for proxied/edge deployments), falls back
 * to `X-Real-IP`, and finally to `null` if neither is present.
 *
 * When forwarded headers are **not** trusted (the default), both headers are
 * ignored entirely and the function returns `null` — the IP is simply
 * unavailable. This is the safe behaviour: a client can set
 * `X-Forwarded-For` to any value on every request, defeating IP-based rate
 * limiting and poisoning audit trails if trusted.
 */
export function clientIpFromRequest(req: Request): string | null {
  if (!isTrustedProxy()) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}
