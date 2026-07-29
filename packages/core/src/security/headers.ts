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
  const headers = new Headers(res.headers);
  // Headers.entries() exists at runtime in Bun but isn't in the DOM lib types.
  for (const [key, value] of (
    extra as unknown as { entries(): IterableIterator<[string, string]> }
  ).entries()) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
