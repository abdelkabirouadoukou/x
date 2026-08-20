import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PostgresClient } from "./postgres";

export interface MigrationOptions {
  /**
   * Behavior when an already-applied migration file has changed on disk.
   * "warn" (default) logs and continues; "fail" aborts the run. Migrations
   * recorded before checksums existed are always treated as "unknown content"
   * and only warned on, never failed.
   */
  onDrift?: "warn" | "fail";
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
  /** Already-applied migrations whose file content no longer matches what ran. */
  drifted: string[];
  /** Already-applied migrations recorded before checksums existed. */
  unknownContent: string[];
}

// Migration files are conventionally numbered with a zero-padded prefix, but
// lexicographic sort still mis-orders them once a prefix grows past the pad
// width (10_x.sql before 2_x.sql). Compare numerically on a leading integer
// when present, falling back to a plain string compare otherwise.
function compareMigrationNames(a: string, b: string): number {
  const numA = /^(\d+)/.exec(a)?.[1];
  const numB = /^(\d+)/.exec(b)?.[1];
  if (numA !== undefined && numB !== undefined) {
    const diff = Number(numA) - Number(numB);
    if (diff !== 0) return diff;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Content hash recorded in `_x_migrations.checksum` (sha256 hex). */
function hashContent(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

export function runSQLiteMigrations(
  db: Database,
  migrationsDir: string,
  options: MigrationOptions = {},
): MigrationResult {
  db.run(`CREATE TABLE IF NOT EXISTS _x_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now')),
    checksum TEXT
  )`);

  // Existing deployments created before checksums existed: backfill the column
  // in place. SQLite (3.37) has no `ADD COLUMN IF NOT EXISTS`, so probe the
  // schema first.
  const columns = db.query("PRAGMA table_info(_x_migrations)").all() as {
    name: string;
  }[];
  if (!columns.some((c) => c.name === "checksum")) {
    db.run("ALTER TABLE _x_migrations ADD COLUMN checksum TEXT");
  }

  const stmt = db.prepare("SELECT name, checksum FROM _x_migrations");
  const applied = new Map(
    (stmt.all() as { name: string; checksum: string | null }[]).map((r) => [r.name, r.checksum]),
  );

  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort(compareMigrationNames);
  } catch {
    return { applied: [], skipped: [], drifted: [], unknownContent: [] };
  }

  const result: MigrationResult = { applied: [], skipped: [], drifted: [], unknownContent: [] };

  for (const file of files) {
    if (applied.has(file)) {
      result.skipped.push(file);
      const stored = applied.get(file) ?? null;
      if (stored === null) {
        // Recorded before checksums were introduced — can't verify content.
        result.unknownContent.push(file);
        console.warn(`[x] migration checksum unknown (applied before checksums): ${file}`);
        continue;
      }
      const current = hashContent(readFileSync(join(migrationsDir, file), "utf-8"));
      if (current !== stored) {
        result.drifted.push(file);
        console.warn(`[x] migration changed after being applied: ${file}`);
        if (options.onDrift === "fail") {
          throw new Error(
            `Migration "${file}" was already applied with different content. ` +
              `Refusing to continue (onDrift: "fail").`,
          );
        }
      }
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
      db.run("INSERT INTO _x_migrations (name, checksum) VALUES (?1, ?2)", [
        file,
        hashContent(sql),
      ]);
    })();
    console.log(`[x] migration applied: ${file}`);
    result.applied.push(file);
  }

  return result;
}

export interface PostgresMigrationResult {
  applied: string[];
  skipped: string[];
  /** Already-applied migrations whose file content no longer matches what ran. */
  drifted: string[];
  /** Already-applied migrations recorded before checksums existed. */
  unknownContent: string[];
}

/**
 * Advisory-lock key that serializes concurrent migration runs across
 * processes/replicas. A fixed constant so every replica contends on the same
 * lock (chosen to be large and arbitrary to avoid colliding with app-lock
 * keys). Run inside the transaction, so it auto-releases on commit.
 */
const MIGRATION_LOCK_KEY = 791975531451977;

export async function runPostgresMigrations(
  client: PostgresClient,
  migrationsDir: string,
  options: MigrationOptions = {},
): Promise<PostgresMigrationResult> {
  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort(compareMigrationNames);
  } catch {
    return { applied: [], skipped: [], drifted: [], unknownContent: [] };
  }

  const result: PostgresMigrationResult = {
    applied: [],
    skipped: [],
    drifted: [],
    unknownContent: [],
  };
  let failed: unknown = null;

  // Serialize the whole run: N replicas booting together must not all apply
  // the same migration (the loser's bookkeeping INSERT hits `_x_migrations`
  // PRIMARY KEY and crashes the boot). The table's own PRIMARY KEY can't stop
  // them — the DDL they run first is not idempotent. A pool-safe serialization
  // is a single wrapping transaction holding a transaction-scoped advisory
  // lock: `begin()` pins every `tx.unsafe` to one connection, so the lock is
  // actually held by the work it guards, and it releases on commit. Each
  // migration still rolls back independently via savepoints — same
  // all-or-nothing-per-file guarantee as before, and migrations applied before
  // a later failure stay committed.
  await client.begin(async (tx) => {
    // The lock guards everything, including creation of the bookkeeping table
    // itself: two booting replicas racing their first `CREATE TABLE IF NOT
    // EXISTS _x_migrations` outside a shared lock hit Postgres's
    // simultaneous-create race on the catalog unique indexes, escaping the
    // serialization entirely. Inside the lock the loser simply finds the table
    // the winner already committed.
    await tx.unsafe("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS _x_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW(),
      checksum TEXT
    )`);
    // Existing deployments created before checksums existed: Postgres supports
    // ADD COLUMN IF NOT EXISTS, so backfill in place.
    await tx.unsafe("ALTER TABLE _x_migrations ADD COLUMN IF NOT EXISTS checksum TEXT");

    // Read applied AFTER taking the lock so the snapshot is in sync with the
    // serialized window.
    const rows = (await tx.unsafe("SELECT name, checksum FROM _x_migrations")) as {
      name: string;
      checksum: string | null;
    }[];
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));

    let seq = 0;
    for (const file of files) {
      if (applied.has(file)) {
        result.skipped.push(file);
        const stored = applied.get(file) ?? null;
        if (stored === null) {
          result.unknownContent.push(file);
          console.warn(`[x] migration checksum unknown (applied before checksums): ${file}`);
          continue;
        }
        const current = hashContent(readFileSync(join(migrationsDir, file), "utf-8"));
        if (current !== stored) {
          result.drifted.push(file);
          console.warn(`[x] migration changed after being applied: ${file}`);
          if (options.onDrift === "fail") {
            // Capture like any other migration failure: stop the run but keep
            // migrations already committed in this run.
            failed = new Error(
              `Migration "${file}" was already applied with different content. ` +
                `Refusing to continue (onDrift: "fail").`,
            );
            break;
          }
        }
        continue;
      }
      // First failure stops the run (matching pre-lock behavior of throwing on
      // the first broken migration) but does not roll back the run so far.
      if (failed !== null) break;

      const raw = readFileSync(join(migrationsDir, file), "utf-8");
      const savepoint = `x_migration_${seq++}`;
      await tx.unsafe(`SAVEPOINT ${savepoint}`);
      try {
        // Parameterized ($1) bookkeeping insert instead of string interpolation
        // so a migration filename can't inject SQL into the bookkeeping
        // statement.
        await tx.unsafe(raw);
        await tx.unsafe("INSERT INTO _x_migrations (name, checksum) VALUES ($1, $2)", [
          file,
          hashContent(raw),
        ]);
        await tx.unsafe(`RELEASE SAVEPOINT ${savepoint}`);
        console.log(`[x] migration applied: ${file}`);
        result.applied.push(file);
      } catch (err) {
        // Roll back just this migration's statements; keep the wrapping
        // transaction alive so everything applied so far commits.
        await tx.unsafe(`ROLLBACK TO SAVEPOINT ${savepoint}`).catch(() => {});
        await tx.unsafe(`RELEASE SAVEPOINT ${savepoint}`).catch(() => {});
        failed = err;
      }
    }
  });

  // The outer `begin()` committed the successful migrations above; rethrow the
  // failure once the transaction is closed.
  if (failed !== null) throw failed;

  return result;
}
