export interface PostgresClient {
  unsafe(query: string): Promise<unknown>;
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}

export interface PostgresOptions {
  url?: string;
  /** Max connections in the pool. Default: 10. */
  max?: number;
  /**
   * TLS mode. Defaults to `"require"` when NODE_ENV=production and
   * `"disable"` otherwise (so local dev against a plain Postgres keeps
   * working). Pass `false` to force-disable in production, or one of
   * `"no-verify"` / `"require"` / `"verify-ca"` / `"verify-full"`.
   */
  ssl?: boolean | "no-verify" | "require" | "verify-ca" | "verify-full";
  /** PEM-encoded CA certificate, used for `verify-ca` / `verify-full`. */
  ca?: string;
  /**
   * How many connection attempts to make (with exponential backoff) before
   * the first query rejects. Handles the case where the database is still
   * coming up when the app boots. Default: 3. Set to 0 to connect without
   * retrying.
   */
  retryAttempts?: number;
  /**
   * Base delay (ms) between connection attempts, doubled each retry.
   * Default: 250.
   */
  retryDelayMs?: number;
  /** Called before each retry attempt (e.g. to log). */
  onRetry?: (attempt: number, error: unknown) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function probeWithRetry(
  sql: Bun.SQL,
  attempts: number,
  baseDelay: number,
  onRetry: ((attempt: number, error: unknown) => void) | undefined,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await sql.unsafe("SELECT 1");
      return;
    } catch (error) {
      if (attempt >= attempts) throw error;
      onRetry?.(attempt, error);
      await sleep(baseDelay * 2 ** (attempt - 1));
    }
  }
}

export function connectPostgres(options: PostgresOptions = {}): PostgresClient {
  const url = options.url ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required — set it via options.url or the DATABASE_URL environment variable",
    );
  }

  const isProd = process.env.NODE_ENV === "production";
  const sslMode =
    options.ssl === false
      ? "disable"
      : options.ssl && options.ssl !== true
        ? options.ssl
        : isProd
          ? "require"
          : "disable";

  const client = new Bun.SQL({
    url,
    max: options.max ?? 10,
    ...(sslMode !== "disable" ? { sslMode } : {}),
    ...(options.ca ? { tls: { ca: options.ca } } : {}),
  });

  const attempts = options.retryAttempts ?? 3;

  if (attempts <= 0) {
    return client as unknown as PostgresClient;
  }

  // Bun.SQL connects lazily on the first query. Guard the first call so the
  // initial connection retries with exponential backoff instead of failing
  // instantly when the database isn't ready yet (common right after a
  // container restart). Subsequent queries delegate straight through.
  const sql = client as unknown as PostgresClient;
  let primed: Promise<void> | null = null;

  const prime = () => {
    primed ??= probeWithRetry(client, attempts, options.retryDelayMs ?? 250, options.onRetry);
    return primed;
  };

  const run = async <T>(work: () => Promise<T>): Promise<T> => {
    if (!primed) await prime();
    return work();
  };

  return new Proxy(sql, {
    get(target, prop, receiver) {
      if (prop === "unsafe") {
        return (query: string) => run(() => client.unsafe(query));
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
    apply(_target, _thisArg, args: [TemplateStringsArray, ...unknown[]]) {
      const [strings, ...values] = args;
      return run(() => client(strings, ...values));
    },
  }) as unknown as PostgresClient;
}
