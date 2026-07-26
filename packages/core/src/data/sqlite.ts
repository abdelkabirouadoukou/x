import { Database } from "bun:sqlite";

export interface SQLiteOptions {
  path?: string;
  wal?: boolean;
  foreignKeys?: boolean;
}

export function connectSQLite(options?: SQLiteOptions): Database {
  const db = new Database(options?.path ?? "data/dev.db");
  if (options?.wal !== false) {
    db.run("PRAGMA journal_mode = WAL");
  }
  if (options?.foreignKeys !== false) {
    db.run("PRAGMA foreign_keys = ON");
  }
  return db;
}
