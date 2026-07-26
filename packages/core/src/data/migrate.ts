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
    db.run(sql);
    db.run("INSERT INTO _x_migrations (name) VALUES (?1)", [file]);
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
    await client.unsafe(raw);
    await client.unsafe(`INSERT INTO _x_migrations (name) VALUES ('${file}')`);
    console.log(`[x] migration applied: ${file}`);
    result.applied.push(file);
  }

  return result;
}
