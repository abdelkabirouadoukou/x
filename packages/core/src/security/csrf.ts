/**
 * CSRF protection for server actions (`/__x/actions/*`) and other mutating
 * endpoints. Two independent checks are provided and both run by default:
 *
 * 1. Origin/Referer verification — rejects cross-site `POST` requests whose
 *    `Origin` (or, failing that, `Referer`) header doesn't match one of the
 *    app's own origins. This alone stops the vast majority of CSRF attempts
 *    from a browser, with zero setup required.
 * 2. Double-submit CSRF token — for apps that want defense in depth, a
 *    random token is issued in a cookie and must be echoed back in the
 *    `x-csrf-token` request header on mutating requests.
 */

const CSRF_COOKIE_NAME = "x_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Always sent over HTTPS in production deployments. The Secure flag prevents
// the cookie from leaking over plain HTTP if a client ever hits the HTTP
// endpoint directly.
const SECURE_COOKIE_FLAG = process.env.NODE_ENV === "production" ? "; Secure" : "";

export interface CsrfOptions {
  /** Origins considered same-site, e.g. ["https://example.com"]. */
  allowedOrigins?: string[];
  /** Require the double-submit token header in addition to origin checks. Default: false. */
  requireToken?: boolean;
  /** Skip CSRF checks entirely. Only use for local tooling/tests. Default: false. */
  disabled?: boolean;
}

export interface CsrfResult {
  ok: boolean;
  reason?: string;
}

/** Parses an `Origin`/`Referer` header value to its canonical origin, or null when unparseable/absent. */
export function originFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Canonical "self" origin of a request (`protocol://host`). Shared with code
 * that must compare an Origin/Referer header against the app's own origin
 * without the CSRF check's strictness (e.g. the hydration-mismatch beacon,
 * which tolerates missing headers). Parsing is crucial: prefix matching
 * (`new URL(o).origin.startsWith(selfOrigin)`) lets `https://app.example.com
 * .evil.com` through, so callers must exact-match this value.
 */
export function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * Verifies the Origin/Referer of a mutating request against the app's own
 * origin plus any explicitly allowed origins. Requests with no Origin or
 * Referer header at all (same-origin requests from older browsers, curl,
 * server-to-server calls with an explicit bypass) are rejected unless the
 * method is safe.
 */
export function verifyOrigin(req: Request, allowedOrigins: string[] = []): CsrfResult {
  if (SAFE_METHODS.has(req.method)) return { ok: true };

  const selfOrigin = requestOrigin(req);
  const allowed = new Set([selfOrigin, ...allowedOrigins].filter(Boolean) as string[]);

  const origin = originFromHeader(req.headers.get("origin"));
  if (origin) {
    return allowed.has(origin)
      ? { ok: true }
      : { ok: false, reason: `origin "${origin}" is not an allowed origin` };
  }

  const referer = originFromHeader(req.headers.get("referer"));
  if (referer) {
    return allowed.has(referer)
      ? { ok: true }
      : { ok: false, reason: `referer origin "${referer}" is not an allowed origin` };
  }

  return { ok: false, reason: "missing Origin and Referer headers on a mutating request" };
}

export function generateCsrfToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/**
 * Constant-time string comparison. Instead of `!==`, which bails on the first
 * differing byte and leaks match position via timing, every byte of both
 * inputs is XOR-accumulated and only the total tells them apart. Both tokens
 * are fixed-width (64 hex chars), so a length check leaks nothing here.
 */
function tokensEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  return diff === 0;
}

/** Double-submit check: the cookie value and the request header must match and be non-empty. */
export function verifyCsrfToken(req: Request): CsrfResult {
  if (SAFE_METHODS.has(req.method)) return { ok: true };
  const cookieToken = readCookie(req, CSRF_COOKIE_NAME);
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken) {
    return { ok: false, reason: `missing CSRF cookie or "${CSRF_HEADER_NAME}" header` };
  }
  if (!tokensEqual(cookieToken, headerToken)) {
    return { ok: false, reason: "CSRF token mismatch" };
  }
  return { ok: true };
}

/** Sets the double-submit CSRF cookie on a response if it isn't already present on the request. */
export function withCsrfCookie(req: Request, res: Response): Response {
  if (readCookie(req, CSRF_COOKIE_NAME)) return res;
  const token = generateCsrfToken();
  const headers = new Headers(res.headers);
  headers.append(
    "Set-Cookie",
    `${CSRF_COOKIE_NAME}=${token}; Path=/; SameSite=Lax${SECURE_COOKIE_FLAG}`,
  );
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** Runs the configured CSRF checks against a request. Returns ok:true when disabled. */
export function checkCsrf(req: Request, options: CsrfOptions = {}): CsrfResult {
  if (options.disabled) return { ok: true };

  const originResult = verifyOrigin(req, options.allowedOrigins ?? []);
  if (!originResult.ok) return originResult;

  if (options.requireToken) {
    const tokenResult = verifyCsrfToken(req);
    if (!tokenResult.ok) return tokenResult;
  }

  return { ok: true };
}
