/**
 * Compiler boundary between server-only environment variables and the
 * client bundle. Convention: only variables prefixed with `THEXJS_PUBLIC_`
 * may ever reach browser code. Anything else read via `process.env.*`,
 * `Bun.env.*`, or `import.meta.env.*` inside a file that ends up in a client
 * bundle is a build error, not a warning — secrets like `STRIPE_SECRET_KEY`
 * or `DATABASE_URL` must never round-trip through the bundler into
 * browser-shipped JS.
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

export class EnvLeakageError extends Error {
  constructor(
    public readonly file: string,
    public readonly keys: string[],
  ) {
    super(
      `[x] server-only environment variable(s) leaked into client bundle "${file}": ${keys.join(", ")}. Only "${PUBLIC_ENV_PREFIX}*" variables may be referenced in client-shipped code — move this access into a loader, server function, or API route.`,
    );
    this.name = "EnvLeakageError";
  }
}

/** Throws EnvLeakageError if the given bundle source references non-public env vars. */
export function assertNoEnvLeakage(code: string, file: string): void {
  const leaked = findLeakedEnvKeys(code);
  if (leaked.length > 0) {
    throw new EnvLeakageError(file, leaked);
  }
}
