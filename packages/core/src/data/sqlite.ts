import { createRequire } from "node:module";
import type { Database } from "bun:sqlite";

export interface SQLiteOptions {
  path?: string;
  wal?: boolean;
  foreignKeys?: boolean;
}

// `bun:sqlite` is a Bun builtin. Loading it through `require()` keeps the
// import lazy so this module (and anything that imports `@thexjs/core/data`)
// still loads on non-Bun runtimes like Vercel's Node.js functions — the
// error only surfaces if someone actually calls connectSQLite() there.
const require = createRequire(import.meta.url);

function loadBunSQLite(): { Database: typeof Database } {
  try {
    return require("bun:sqlite") as { Database: typeof Database };
  } catch {
    throw new Error(
      "connectSQLite requires the Bun runtime (bun:sqlite). Use connectPostgres on non-Bun runtimes like Vercel.",
    );
  }
}

export function connectSQLite(options?: SQLiteOptions): Database {
  const { Database: DB } = loadBunSQLite();
  const db = new DB(options?.path ?? "data/dev.db");
  if (options?.wal !== false) {
    db.run("PRAGMA journal_mode = WAL");
  }
  if (options?.foreignKeys !== false) {
    db.run("PRAGMA foreign_keys = ON");
  }
  return db;
}
