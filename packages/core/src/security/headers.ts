/**
 * Security headers helper. Applies sane, overridable defaults for
 * Content-Security-Policy, Strict-Transport-Security and X-Frame-Options
 * (plus a couple of low-risk extras) to every response.
 */

export interface SecurityHeadersOptions {
  /** Full CSP value, or false to disable. Default: a conservative same-origin policy. */
  contentSecurityPolicy?: string | false;
  /** HSTS max-age in seconds, or false to disable. Default: 15552000 (180 days). */
  hstsMaxAge?: number | false;
  /** Include subdomains in HSTS. Default: true. */
  hstsIncludeSubDomains?: boolean;
  /** X-Frame-Options value, or false to disable. Default: "DENY". */
  frameOptions?: string | false;
  /** X-Content-Type-Options. Default: "nosniff". Set false to disable. */
  contentTypeOptions?: string | false;
  /** Referrer-Policy. Default: "strict-origin-when-cross-origin". Set false to disable. */
  referrerPolicy?: string | false;
}

const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'";

export function buildSecurityHeaders(options: SecurityHeadersOptions = {}): Headers {
  const headers = new Headers();

  const csp = options.contentSecurityPolicy ?? DEFAULT_CSP;
  if (csp !== false) headers.set("Content-Security-Policy", csp);

  const hstsMaxAge = options.hstsMaxAge ?? 15552000;
  if (hstsMaxAge !== false) {
    const includeSub = options.hstsIncludeSubDomains ?? true;
    headers.set(
      "Strict-Transport-Security",
      `max-age=${hstsMaxAge}${includeSub ? "; includeSubDomains" : ""}`,
    );
  }

  const frameOptions = options.frameOptions ?? "DENY";
  if (frameOptions !== false) headers.set("X-Frame-Options", frameOptions);

  const contentTypeOptions = options.contentTypeOptions ?? "nosniff";
  if (contentTypeOptions !== false) headers.set("X-Content-Type-Options", contentTypeOptions);

  const referrerPolicy = options.referrerPolicy ?? "strict-origin-when-cross-origin";
  if (referrerPolicy !== false) headers.set("Referrer-Policy", referrerPolicy);

  return headers;
}

/** Returns a new Response with security headers merged onto the original response's headers. */
export function applySecurityHeaders(
  res: Response,
  options: SecurityHeadersOptions = {},
): Response {
  const extra = buildSecurityHeaders(options);
  // Mutate res.headers in place rather than `new Response(res.body, ...)`.
  // Reconstructing the Response re-parents the underlying ReadableStream on
  // every single request — harmless for a normal one-shot body, but for a
  // long-lived stream (e.g. the /__x/reload SSE endpoint) it was needlessly
  // re-wrapping the same live stream twice per request (here and again in
  // withRequestLogging), which was contributing to broken chunked framing.
  // A constructed Response's headers are mutable, so this is safe.
  // Headers.entries()/.keys() exist at runtime in Bun but aren't in the DOM
  // lib types tsup builds against, so cast the same way the loop below does
  // instead of calling them directly (that mismatch is what broke the DTS build).
  for (const [key, value] of (
    extra as unknown as { entries(): IterableIterator<[string, string]> }
  ).entries()) {
    if (!res.headers.has(key)) {
      res.headers.set(key, value);
    }
  }
  return res;
}
