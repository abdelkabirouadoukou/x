/**
 * Secret redaction for structured logging.
 *
 * Server logs can silently echo secrets — a DB driver error interpolating a
 * connection string, an app error whose message contains a token, or a caller
 * passing `{ password }` into the logger. This is separate from the build-time
 * env-leak scanner: that one protects client bundles; this one keeps values
 * shaped like secrets out of anything emitted to the log sink, in dev and prod
 * alike. It is belt-and-suspenders, not a substitute for not logging secrets —
 * the pass is deliberately conservative (a key containing "token" anywhere is
 * treated as sensitive).
 */

export const REDACTED = "[REDACTED]";

/** Key names whose values are treated as secrets. Case-insensitive substring match. */
const SENSITIVE_KEY_RE =
  /(password|passwd|token|secret|authorization|cookie|session|credential|api[_ -]?key|private[_ -]?key|access[_ -]?key|refresh[_ -]?token|bearer)/i;

/** True when a field key looks like it holds a secret value. */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_RE.test(key);
}

/** Masks bearer/basic credentials, inline `Authorization: ...` values and URI userinfo (connection strings) in a string. */
export function redactString(input: string): string {
  return input
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=:-]+/gi, `$1 ${REDACTED}`)
    .replace(/\b(authorization|auth)\s*[:=]\s*[^\s,;]+/gi, `$1 ${REDACTED}`)
    .replace(/(\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/\s@:]*:)([^/\s]*)(@)/g, `$1${REDACTED}$3`);
}

/**
 * Recursively redacts a value before it is serialized to a log line:
 * - values under a sensitive key names are replaced with {@link REDACTED};
 * - string values (including error messages) are scanned for embedded bearer
 *   tokens / `Authorization:` values;
 * - arrays and plain objects are walked recursively. Non-plain objects and
 *   primitives other than strings pass through untouched.
 */
export function redactValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactString(value);
  if (depth > 10) return value;
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : redactValue(val, depth + 1);
    }
    return out;
  }
  return value;
}
