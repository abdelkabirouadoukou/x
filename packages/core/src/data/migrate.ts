import type { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { PostgresClient } from "./postgres";

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

export function runSQLiteMigrations(db: Database, migrationsDir: string): MigrationResult {
  db.run(`CREATE TABLE IF NOT EXISTS _x_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);

  const stmt = db.prepare("SELECT name FROM _x_migrations");
  const applied = new Set((stmt.all() as { name: string }[]).map((r) => r.name));

  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    return { applied: [], skipped: [] };
  }

  const result: MigrationResult = { applied: [], skipped: [] };

  for (const file of files) {
    if (applied.has(file)) {
      result.skipped.push(file);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    // Run the migration SQL and its bookkeeping insert in a single
    // transaction (auto-commit on success, rollback if anything throws). A
    // migration that fails partway otherwise leaves the schema half-applied
    // with no record it was attempted, so a retry replays broken statements
    // against the already-mutated schema.
    db.transaction(() => {
      db.run(sql);
      db.run("INSERT INTO _x_migrations (name) VALUES (?1)", [file]);
    })();
    console.log(`[x] migration applied: ${file}`);
    result.applied.push(file);
  }

  return result;
}

export interface PostgresMigrationResult {
  applied: string[];
  skipped: string[];
}

export async function runPostgresMigrations(
  client: PostgresClient,
  migrationsDir: string,
): Promise<PostgresMigrationResult> {
  await client.unsafe(`CREATE TABLE IF NOT EXISTS _x_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
  )`);

  const rows = (await client.unsafe("SELECT name FROM _x_migrations")) as {
    name: string;
  }[];
  const applied = new Set(rows.map((r) => r.name));

  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    return { applied: [], skipped: [] };
  }

  const result: PostgresMigrationResult = { applied: [], skipped: [] };

  for (const file of files) {
    if (applied.has(file)) {
      result.skipped.push(file);
      continue;
    }
    const raw = readFileSync(join(migrationsDir, file), "utf-8");
    // Same all-or-nothing guarantee as the SQLite runner: migration SQL +
    // bookkeeping insert run inside one transaction, so a failing migration
    // rolls back cleanly and can be retried after a fix. The insert is
    // parameterized ($1) instead of string-interpolated, so a migration
    // filename can't inject SQL into the bookkeeping statement.
    await client.begin(async (tx) => {
      await tx.unsafe(raw);
      await tx.unsafe("INSERT INTO _x_migrations (name) VALUES ($1)", [file]);
    });
    console.log(`[x] migration applied: ${file}`);
    result.applied.push(file);
  }

  return result;
}
