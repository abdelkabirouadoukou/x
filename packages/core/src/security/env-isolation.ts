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
  return [...found];
}

export class EnvLeakageError extends Error {
  constructor(
    public readonly file: string,
    public readonly keys: string[],
  ) {
    super(
      `[x] server-only environment variable(s) leaked into client bundle "${file}": ` +
        `${keys.join(", ")}. Only "${PUBLIC_ENV_PREFIX}*" variables may be referenced in ` +
        "client-shipped code — move this access into a loader, server function, or API route.",
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
