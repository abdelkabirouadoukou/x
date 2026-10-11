/**
 * Compiler boundary between server-only environment variables and the
 * client bundle. Convention: only variables prefixed with `THEXJS_PUBLIC_`
 * may ever reach browser code. Anything else read via `process.env.*`,
 * `Bun.env.*`, or `import.meta.env.*` inside a file that ends up in a client
 * bundle is a build error, not a warning — secrets like `STRIPE_SECRET_KEY`
 * or `DATABASE_URL` must never round-trip through the bundler into
 * browser-shipped JS.
 *
 * Two layers of defense, run together at every client-bundle call site:
 *  - `findLeakedEnvKeys` / `assertNoEnvLeakage`: a static scan for the
 *    *syntax* `process.env.X` (and the `Bun.env` / `import.meta.env`
 *    equivalents) in the bundled output. This is what catches a leak today,
 *    since the pinned Bun toolchain preserves that syntax rather than
 *    inlining it.
 *  - `findLeakedEnvValues`: a scan for the literal serialized *value* of any
 *    non-public env var in the bundled output, regardless of what syntax (if
 *    any) produced it. This exists so a future bundler/config change that
 *    inlines `process.env.X` into a string literal — which would make the
 *    key-scan above match nothing — still gets caught. Restricted to
 *    sensitive-looking names/values (see `isSensitiveEnvKey` / `looksRandom`)
 *    so ordinary values like `VERCEL_ENV=production` don't fail real builds
 *    just because the word "production" also appears somewhere in the
 *    bundle.
 * Neither catches a value that a build plugin re-encodes (e.g. base64,
 * concatenation) before it lands in the bundle; that's a known gap, not a
 * silent one, since both scans run on the final emitted text.
 */

export const PUBLIC_ENV_PREFIX = "THEXJS_PUBLIC_";

const ENV_ACCESS_PATTERNS = [
  /\bprocess\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /\bprocess\.env\[["']([A-Za-z_][A-Za-z0-9_]*)["']\]/g,
  /\bBun\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /\bBun\.env\[["']([A-Za-z_][A-Za-z0-9_]*)["']\]/g,
  /\bimport\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /\bimport\.meta\.env\[["']([A-Za-z_][A-Za-z0-9_]*)["']\]/g,
];

/**
 * Patterns for env access that a naive key-scan can't pin to a literal name —
 * dynamic keys (`process.env[key]`), string-concatenated keys
 * (`process.env["ST" + "RIPE"]`), and bare/aliased env objects
 * (`const e = process.env; e.KEY`). The key-scan can't name the exact
 * variable, but any of these inside a client bundle is still a leak by policy,
 * so they're flagged with a descriptive marker instead of silently passing.
 */
const SUSPICIOUS_ENV_PATTERNS: { re: RegExp; label: string }[] = [
  {
    re: /\b(?:process|Bun|import\.meta)\.env\s*\[[^"'`]/g,
    label: "dynamic env key access",
  },
  {
    re: /\b(?:process|Bun|import\.meta)\.env\[["'][^"']*["']\s*\+/g,
    label: "concatenated env key access",
  },
  {
    re: /\b(?:process|Bun)\.env\b(?!\s*(?:\.|\[))/g,
    label: "bare process.env access (aliasing/mutation)",
  },
];

/**
 * Scans bundled JS/TS source for references to environment variables that
 * are not public (`THEXJS_PUBLIC_`-prefixed). Returns the offending variable
 * names, deduplicated. An empty array means the code is clean.
 */
export function findLeakedEnvKeys(code: string): string[] {
  const found = new Set<string>();
  for (const pattern of ENV_ACCESS_PATTERNS) {
    for (const match of code.matchAll(pattern)) {
      const key = match[1];
      if (key && !key.startsWith(PUBLIC_ENV_PREFIX)) {
        found.add(key);
      }
    }
  }
  for (const { re, label } of SUSPICIOUS_ENV_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(code)) found.add(`process.env (${label})`);
  }
  return [...found];
}

// Values shorter than this are skipped: short strings like "1", "true", or
// "" are common non-secret env values and would otherwise match huge swaths
// of unrelated bundled code (numbers, booleans, etc.), turning the scan into
// noise instead of a signal.
const MIN_LEAKED_VALUE_LENGTH = 6;

// Keys whose values routinely show up verbatim in legitimately-shipped
// client code without being a leak: Bun inlines `process.env.NODE_ENV` for
// browser targets (so "production"/"development" ends up in React's own
// entry shim), and shell/CI-provided vars like PWD/INIT_CWD/HOSTNAME often
// contain path fragments or hostnames that can coincidentally match strings
// in vendor bundles. Excluding them keeps the scan a signal, not noise.
const SAFE_ENV_KEYS = new Set([
  "NODE_ENV",
  "PWD",
  "OLDPWD",
  "INIT_CWD",
  "HOSTNAME",
  "HOME",
  "USER",
  "USERNAME",
  "SHELL",
  "LANG",
  "LC_ALL",
  "TERM",
  "PATH",
  "TMPDIR",
  "TEMP",
  "TMP",
]);

// Name fragments that suggest a variable actually holds a secret. The value
// scan is restricted to these (plus `looksRandom` below) because an
// unrestricted scan flags ordinary, non-secret values like
// `VERCEL_ENV=production`, `APP_ENV=production`, or `DB_HOST=localhost` the
// moment that word happens to also appear somewhere in React or in page
// content — which is common and not a leak.
const SENSITIVE_KEY_PATTERNS = [
  /SECRET/i,
  /TOKEN/i,
  /PASSWORD/i,
  /PRIVATE/i,
  /CREDENTIAL/i,
  /API_KEY/i,
  /_KEY$/i,
  /AUTH/i,
  /SALT/i,
  /DSN/i,
  /DATABASE_URL/i,
  /CONNECTION_STRING/i,
];

/**
 * Escape hatch: a comma-separated list of variable names the value scan skips,
 * e.g. `THEXJS_ENV_SCAN_IGNORE=AUTH_MODE,TOKEN_URL`. For non-secret variables
 * whose values collide with bundle text. It only affects the value scan:
 * `process.env.X` references in client code are still rejected.
 */
export const ENV_SCAN_IGNORE_KEY = "THEXJS_ENV_SCAN_IGNORE";

function isSensitiveEnvKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));
}

// A value that reads as random-looking (long, digit-bearing, base64/hex-like
// charset) is worth flagging even under a key name that doesn't look
// sensitive, since that's the shape of an actual generated secret rather than
// a plain English/config word.
const MIN_RANDOM_VALUE_LENGTH = 24;
const RANDOM_LOOKING_VALUE_RE = /^[A-Za-z0-9+/_=-]+$/;

function looksRandom(value: string): boolean {
  return (
    value.length >= MIN_RANDOM_VALUE_LENGTH &&
    /[0-9]/.test(value) &&
    RANDOM_LOOKING_VALUE_RE.test(value)
  );
}

/**
 * Scans bundled JS/TS source for the literal serialized *value* of any
 * non-public (`THEXJS_PUBLIC_`-prefixed) environment variable. Unlike
 * `findLeakedEnvKeys`, this doesn't look for `process.env.X` syntax — it
 * looks for the secret's actual value verbatim in the output, so it still
 * catches a leak if a bundler inlined the value into a string literal and
 * dropped the `process.env` reference entirely. Only variables that look
 * sensitive by name or whose value looks like a generated secret are
 * checked (see `isSensitiveEnvKey` / `looksRandom`) — otherwise ordinary
 * config values collide with unrelated bundle text far too often. Returns
 * the offending variable names, deduplicated. An empty array means no known
 * env value appears literally in the code.
 */
export function findLeakedEnvValues(
  code: string,
  env: Record<string, string | undefined>,
): string[] {
  const found = new Set<string>();
  const ignored = new Set(
    (env[ENV_SCAN_IGNORE_KEY] ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  );
  for (const [key, value] of Object.entries(env)) {
    if (!value || key.startsWith(PUBLIC_ENV_PREFIX) || SAFE_ENV_KEYS.has(key)) continue;
    if (key === ENV_SCAN_IGNORE_KEY || ignored.has(key)) continue;
    if (value.length < MIN_LEAKED_VALUE_LENGTH) continue;
    if (!isSensitiveEnvKey(key) && !looksRandom(value)) continue;
    if (code.includes(value)) found.add(key);
  }
  return [...found];
}

export class EnvLeakageError extends Error {
  constructor(
    public readonly file: string,
    public readonly keys: string[],
    kind: "access" | "value" = "access",
  ) {
    const detail =
      kind === "value"
        ? "its value was found literally in the bundled output (no process.env.* reference, only a value match) — track down where this string is embedded and move it out of client-shipped code"
        : "move this access into a loader, server function, or API route";
    super(
      `[x] server-only environment variable(s) leaked into client bundle "${file}": ${keys.join(", ")}. Only "${PUBLIC_ENV_PREFIX}*" variables may be referenced in client-shipped code — ${detail}.`,
    );
    this.name = "EnvLeakageError";
  }
}

/** Throws EnvLeakageError if the given bundle source references non-public env vars. */
export function assertNoEnvLeakage(code: string, file: string): void {
  const leaked = findLeakedEnvKeys(code);
  if (leaked.length > 0) {
    throw new EnvLeakageError(file, leaked, "access");
  }
}

/** Throws EnvLeakageError if the given bundle source contains a non-public env var's literal value. */
export function assertNoEnvValueLeakage(
  code: string,
  file: string,
  env: Record<string, string | undefined>,
): void {
  const leaked = findLeakedEnvValues(code, env);
  if (leaked.length > 0) {
    throw new EnvLeakageError(file, leaked, "value");
  }
}
