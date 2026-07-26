export interface PostgresClient {
  unsafe(query: string): Promise<unknown>;
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}

export interface PostgresOptions {
  url?: string;
}

export function connectPostgres(options?: PostgresOptions): PostgresClient {
  const url = options?.url ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required — set it via options.url or the DATABASE_URL environment variable",
    );
  }
  return Bun.sql(url) as unknown as PostgresClient;
}
