/**
 * Returns the client IP from a request, checking `X-Forwarded-For` first
 * (for proxied/edge deployments), falling back to `X-Real-IP`, and finally
 * to `null` if neither is present.
 */
export function clientIpFromRequest(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}
