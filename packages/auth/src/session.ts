import type { Database } from "bun:sqlite";
import { connectSQLite } from "@thexjs/core/data";
import type { AuthUser, Session } from "./types";

/** Structural subset of the Postgres client returned by `connectPostgres`. */
interface PostgresClient {
  unsafe(query: string, params?: unknown[]): Promise<unknown>;
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}

/**
 * A durable session store. Both bundled stores sit on the x data layer
 * (`connectSQLite` / a `connectPostgres` client) and store sessions in a
 * single `x_sessions` table keyed by an opaque token.
 */
export interface SessionStore {
  create(session: Session): Promise<void>;
  find(token: string): Promise<Session | null>;
  revoke(token: string): Promise<void>;
}

export interface SQLiteSessionStoreOptions {
  /** Path for the SQLite file when no `db` is provided. Default: `data/auth.db`. */
  path?: string;
  /** A pre-opened `bun:sqlite` Database (e.g. `:memory:` in tests). */
  db?: Database;
}

const CREATE_SQLITE_TABLE = `CREATE TABLE IF NOT EXISTS x_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  user_data TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)`;

const CREATE_POSTGRES_TABLE = `CREATE TABLE IF NOT EXISTS x_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  user_data TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
)`;

interface SessionRow {
  token: string;
  user_id: string;
  provider: string;
  user_data: string;
  expires_at: number;
  created_at: number;
}

function rowToSession(row: SessionRow): Session {
  let user: AuthUser;
  try {
    user = JSON.parse(row.user_data) as AuthUser;
  } catch {
    user = { id: row.user_id };
  }
  return {
    token: row.token,
    userId: row.user_id,
    provider: row.provider,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    user,
  };
}

/** A session store backed by `bun:sqlite` (via `@thexjs/core/data`'s `connectSQLite`). */
export function createSQLiteSessionStore(options: SQLiteSessionStoreOptions = {}): SessionStore {
  const db = options.db ?? connectSQLite({ path: options.path ?? "data/auth.db" });
  db.run(CREATE_SQLITE_TABLE);

  return {
    async create(session) {
      db.run(
        "INSERT OR REPLACE INTO x_sessions (token, user_id, provider, user_data, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        [
          session.token,
          session.userId,
          session.provider,
          JSON.stringify(session.user),
          session.expiresAt,
          session.createdAt,
        ],
      );
    },
    async find(token) {
      const row = db.query("SELECT * FROM x_sessions WHERE token = ?1").get(token) as
        | SessionRow
        | undefined;
      return row ? rowToSession(row) : null;
    },
    async revoke(token) {
      db.run("DELETE FROM x_sessions WHERE token = ?1", [token]);
    },
  };
}

/** A session store backed by Postgres through a `connectPostgres` client. */
export function createPostgresSessionStore(client: PostgresClient): SessionStore {
  // Bun.SQL connects lazily and DDL is idempotent, so ensure the table on
  // first use instead of at construction time.
  let ready: Promise<unknown> | null = null;
  const ensure = () => {
    ready ??= client.unsafe(CREATE_POSTGRES_TABLE);
    return ready;
  };

  return {
    async create(session) {
      await ensure();
      await client.unsafe(
        "INSERT INTO x_sessions (token, user_id, provider, user_data, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (token) DO UPDATE SET user_id = $2, provider = $3, user_data = $4, expires_at = $5",
        [
          session.token,
          session.userId,
          session.provider,
          JSON.stringify(session.user),
          session.expiresAt,
          session.createdAt,
        ],
      );
    },
    async find(token) {
      await ensure();
      const rows = (await client.unsafe("SELECT * FROM x_sessions WHERE token = $1", [
        token,
      ])) as SessionRow[];
      const row = rows[0];
      return row ? rowToSession(row) : null;
    },
    async revoke(token) {
      await ensure();
      await client.unsafe("DELETE FROM x_sessions WHERE token = $1", [token]);
    },
  };
}
