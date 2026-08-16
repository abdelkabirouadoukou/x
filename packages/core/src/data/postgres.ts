/** A Postgres client scoped to a single transaction (auto-commit/rollback). */
export interface PostgresTransactionClient {
  unsafe(query: string, params?: unknown[]): Promise<unknown>;
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}

export interface PostgresClient {
  unsafe(query: string, params?: unknown[]): Promise<unknown>;
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  /**
   * Runs `fn` inside a transaction. The callback receives a transaction-scoped
   * client; when it resolves the transaction commits, when it throws it rolls
   * back — so a group of statements either all apply or none do.
   */
  begin<T>(fn: (tx: PostgresTransactionClient) => Promise<T>): Promise<T>;
}

export type PostgresSslMode = "disable" | "prefer" | "require" | "verify-ca" | "verify-full";

export interface PostgresOptions {
  url?: string;
  /** Max connections in the pool. Default: 10. */
  max?: number;
  /**
   * TLS policy. Defaults to `"require"` when NODE_ENV=production and
   * `"disable"` otherwise (so local dev against a plain Postgres keeps
   * working). Pass `false` to force-disable in production, or one of the
   * Postgres SSL modes. `"no-verify"` is an alias for `"require"`.
   */
  ssl?: boolean | "no-verify" | PostgresSslMode;
  /** PEM-encoded CA certificate, used with `verify-ca` / `verify-full`. */
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

  // Bun.SQL selects the TLS policy via `?sslmode=` on the connection URL — the
  // `ssl`/`sslMode` options keys only accept a boolean/TLSOptions and a string
  // mode there is silently ignored (falling back to the weak default). Bake
  // the resolved mode into the URL so it's actually applied.
  let sslMode: PostgresSslMode;
  if (options.ssl === false) {
    sslMode = "disable";
  } else if (options.ssl === true) {
    sslMode = "require";
  } else if (options.ssl === "no-verify") {
    sslMode = "require";
  } else if (typeof options.ssl === "string") {
    sslMode = options.ssl;
  } else {
    sslMode = isProd ? "require" : "disable";
  }

  const connectionUrl = new URL(url);
  if (sslMode !== "disable") {
    connectionUrl.searchParams.set("sslmode", sslMode);
  }

  const client = new Bun.SQL({
    url: connectionUrl,
    max: options.max ?? 10,
    // Providing a CA also turns on certificate verification (Bun escalates a
    // `ca`-bearing tls object to verify-full), so only attach it when a
    // verified mode is in effect.
    ...(options.ca && sslMode !== "disable" ? { tls: { ca: options.ca } } : {}),
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
    // Always await prime(): prime() is memoized, so this is a no-op after the
    // first call, but awaiting every time closes the race where two queries
    // kicked off in the same tick (e.g. Promise.all) both see `primed` as set
    // and skip the retry/backoff that the first query is still running.
    try {
      await prime();
    } catch (error) {
      // Reset the memo so a later query re-probes with backoff instead of
      // replaying the rejected probe forever. Without this, a database that
      // is briefly down when the app boots permanently wedges the client —
      // every subsequent query would reject instantly even after the DB
      // comes back.
      primed = null;
      throw error;
    }
    return work();
  };

  return new Proxy(sql, {
    get(target, prop, receiver) {
      if (prop === "unsafe") {
        return (query: string, params?: unknown[]) => run(() => client.unsafe(query, params));
      }
      if (prop === "begin") {
        return <T>(fn: (tx: PostgresTransactionClient) => Promise<T>) =>
          run(() => client.begin(async (tx) => fn(tx as unknown as PostgresTransactionClient)));
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
