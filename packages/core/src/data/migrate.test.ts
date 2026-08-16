import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runPostgresMigrations, runSQLiteMigrations } from "./migrate";
import { type PostgresClient, connectPostgres } from "./postgres";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/migrations");

// Real-Postgres integration coverage for runPostgresMigrations(). Requires a
// DATABASE_URL (set in CI via a postgres service, or locally against any
// Postgres) and skips cleanly when it's absent — no mocked Bun.SQL, since that
// would only test the mock. Each test runs in a freshly created database so
// they stay isolated on a shared server.
const PG_TEST_URL = process.env.DATABASE_URL;

function resetFixtures() {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  mkdirSync(FIXTURE_DIR, { recursive: true });
}

function writeMigration(name: string, sql: string) {
  writeFileSync(join(FIXTURE_DIR, name), sql);
}

function tableExists(db: Database, name: string): boolean {
  const row = db
    .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?1")
    .get(name) as { name: string } | undefined;
  return row !== undefined;
}

function appliedNames(db: Database): string[] {
  const rows = db.query("SELECT name FROM _x_migrations ORDER BY name").all() as {
    name: string;
  }[];
  return rows.map((r) => r.name);
}

beforeAll(() => {
  resetFixtures();
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("runSQLiteMigrations", () => {
  test("applies migrations in filename order", () => {
    resetFixtures();
    writeMigration(
      "001_create_users.sql",
      "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL);",
    );
    writeMigration(
      "002_add_profiles.sql",
      "CREATE TABLE profiles (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id));",
    );

    const db = new Database(":memory:");
    const result = runSQLiteMigrations(db, FIXTURE_DIR);

    expect(result.applied).toEqual(["001_create_users.sql", "002_add_profiles.sql"]);
    expect(result.skipped).toEqual([]);
    expect(tableExists(db, "users")).toBe(true);
    expect(tableExists(db, "profiles")).toBe(true);
    expect(appliedNames(db)).toEqual(["001_create_users.sql", "002_add_profiles.sql"]);
    db.close();
  });

  test("orders migrations numerically, not lexically (10 before 2)", () => {
    resetFixtures();
    writeMigration("10_add_ten.sql", "CREATE TABLE ten (id INTEGER PRIMARY KEY);");
    writeMigration("2_add_two.sql", "CREATE TABLE two (id INTEGER PRIMARY KEY);");

    const db = new Database(":memory:");
    const result = runSQLiteMigrations(db, FIXTURE_DIR);

    expect(result.applied).toEqual(["2_add_two.sql", "10_add_ten.sql"]);
    expect(tableExists(db, "two")).toBe(true);
    expect(tableExists(db, "ten")).toBe(true);
    db.close();
  });

  test("skips migrations that were already applied", () => {
    resetFixtures();
    writeMigration("001_create_users.sql", "CREATE TABLE users (id INTEGER PRIMARY KEY);");

    const db = new Database(":memory:");
    const first = runSQLiteMigrations(db, FIXTURE_DIR);
    expect(first.applied).toEqual(["001_create_users.sql"]);

    const second = runSQLiteMigrations(db, FIXTURE_DIR);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual(["001_create_users.sql"]);
    db.close();
  });

  test("rolls back a migration that fails partway", () => {
    resetFixtures();
    writeMigration(
      "001_create_items.sql",
      "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
    );
    // The second statement violates the primary key — the whole file must
    // fail as one unit inside its transaction: no partial rows and no
    // bookkeeping record, so a retry replays it against a clean schema.
    writeMigration(
      "002_broken.sql",
      "INSERT INTO items (id, name) VALUES (1, 'first');\nINSERT INTO items (id, name) VALUES (1, 'duplicate');",
    );

    const db = new Database(":memory:");
    expect(() => runSQLiteMigrations(db, FIXTURE_DIR)).toThrow();

    // The earlier migration is still applied and its data is intact...
    expect(appliedNames(db)).toEqual(["001_create_items.sql"]);
    // ...but the failed migration left no trace: rows it inserted were rolled
    // back and it was never recorded as applied.
    const rows = db.query("SELECT COUNT(*) AS c FROM items").get() as { c: number };
    expect(rows.c).toBe(0);
    db.close();
  });

  test("retries a previously failed migration after a fix", () => {
    resetFixtures();
    writeMigration(
      "001_create_items.sql",
      "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
    );
    writeMigration(
      "002_broken.sql",
      "INSERT INTO items (id, name) VALUES (1, 'first');\nINSERT INTO items (id, name) VALUES (1, 'duplicate');",
    );

    const db = new Database(":memory:");
    expect(() => runSQLiteMigrations(db, FIXTURE_DIR)).toThrow();

    writeMigration(
      "002_broken.sql",
      "INSERT INTO items (id, name) VALUES (1, 'first');\nINSERT INTO items (id, name) VALUES (2, 'second');",
    );

    const retry = runSQLiteMigrations(db, FIXTURE_DIR);
    expect(retry.applied).toEqual(["002_broken.sql"]);
    expect(appliedNames(db)).toEqual(["001_create_items.sql", "002_broken.sql"]);
    const rows = db.query("SELECT name FROM items ORDER BY id").all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual(["first", "second"]);
    db.close();
  });
});

// Real-Postgres integration tests. Skipped unless DATABASE_URL is set (see
// PG_TEST_URL above); CI provides one through a postgres service container.
describe.if(Boolean(PG_TEST_URL))("runPostgresMigrations", () => {
  let admin: PostgresClient;

  beforeAll(() => {
    admin = connectPostgres({ url: PG_TEST_URL as string, max: 1 });
  });

  afterAll(() => {
    (admin as unknown as { close(): void }).close();
  });

  /** Creates a throwaway database, runs `fn` against it, and drops it. */
  async function withDatabase<T>(fn: (client: PostgresClient) => Promise<T>): Promise<T> {
    const dbName = `x_mig_${crypto.randomUUID().replace(/-/g, "")}`;
    await admin.unsafe(`CREATE DATABASE "${dbName}"`);
    const url = new URL(PG_TEST_URL as string);
    url.pathname = `/${dbName}`;
    const client = connectPostgres({ url: url.toString(), max: 1 });
    try {
      return await fn(client);
    } finally {
      (client as unknown as { close(): void }).close();
      await admin.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    }
  }

  async function tableExists(client: PostgresClient, name: string): Promise<boolean> {
    const rows = (await client.unsafe(
      "SELECT 1 AS found FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
      [name],
    )) as { found: number }[];
    return rows.length > 0;
  }

  async function appliedNames(client: PostgresClient): Promise<string[]> {
    const rows = (await client.unsafe("SELECT name FROM _x_migrations ORDER BY name")) as {
      name: string;
    }[];
    return rows.map((r) => r.name);
  }

  test("applies migrations in filename order", async () => {
    resetFixtures();
    writeMigration(
      "001_create_users.sql",
      "CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL);",
    );
    writeMigration(
      "002_add_profiles.sql",
      "CREATE TABLE profiles (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id));",
    );

    await withDatabase(async (client) => {
      const result = await runPostgresMigrations(client, FIXTURE_DIR);

      expect(result.applied).toEqual(["001_create_users.sql", "002_add_profiles.sql"]);
      expect(result.skipped).toEqual([]);
      expect(await tableExists(client, "users")).toBe(true);
      expect(await tableExists(client, "profiles")).toBe(true);
      expect(await appliedNames(client)).toEqual(["001_create_users.sql", "002_add_profiles.sql"]);
    });
  });

  test("skips migrations that were already applied", async () => {
    resetFixtures();
    writeMigration("001_create_users.sql", "CREATE TABLE users (id SERIAL PRIMARY KEY);");

    await withDatabase(async (client) => {
      const first = await runPostgresMigrations(client, FIXTURE_DIR);
      expect(first.applied).toEqual(["001_create_users.sql"]);

      const second = await runPostgresMigrations(client, FIXTURE_DIR);
      expect(second.applied).toEqual([]);
      expect(second.skipped).toEqual(["001_create_users.sql"]);
    });
  });

  test("rolls back a migration that fails partway", async () => {
    resetFixtures();
    writeMigration(
      "001_create_items.sql",
      "CREATE TABLE items (id SERIAL PRIMARY KEY, name TEXT NOT NULL);",
    );
    // The second file creates a table (a schema change), inserts a valid row,
    // then violates the primary key — the whole file must fail as one unit
    // inside its transaction: no partial schema, no partial rows, and no
    // bookkeeping record, so a retry replays it against a clean schema.
    writeMigration(
      "002_broken.sql",
      "CREATE TABLE audit_log (id SERIAL PRIMARY KEY);\nINSERT INTO items (id, name) VALUES (1, 'first');\nINSERT INTO items (id, name) VALUES (1, 'duplicate');",
    );

    await withDatabase(async (client) => {
      await expect(runPostgresMigrations(client, FIXTURE_DIR)).rejects.toThrow();

      // The earlier migration is still applied and its data is intact...
      expect(await appliedNames(client)).toEqual(["001_create_items.sql"]);
      // ...but the failed migration left no trace: its schema change was rolled
      // back, its rows were rolled back, and it was never recorded as applied.
      expect(await tableExists(client, "audit_log")).toBe(false);
      const rows = (await client.unsafe("SELECT COUNT(*) AS c FROM items")) as {
        c: number | string;
      }[];
      expect(Number(rows[0]?.c)).toBe(0);
    });
  });

  test("retries a previously failed migration after a fix", async () => {
    resetFixtures();
    writeMigration(
      "001_create_items.sql",
      "CREATE TABLE items (id SERIAL PRIMARY KEY, name TEXT NOT NULL);",
    );
    writeMigration(
      "002_broken.sql",
      "INSERT INTO items (id, name) VALUES (1, 'first');\nINSERT INTO items (id, name) VALUES (1, 'duplicate');",
    );

    await withDatabase(async (client) => {
      await expect(runPostgresMigrations(client, FIXTURE_DIR)).rejects.toThrow();

      writeMigration(
        "002_broken.sql",
        "INSERT INTO items (id, name) VALUES (1, 'first');\nINSERT INTO items (id, name) VALUES (2, 'second');",
      );

      const retry = await runPostgresMigrations(client, FIXTURE_DIR);
      expect(retry.applied).toEqual(["002_broken.sql"]);
      expect(await appliedNames(client)).toEqual(["001_create_items.sql", "002_broken.sql"]);
      const rows = (await client.unsafe("SELECT name FROM items ORDER BY id")) as {
        name: string;
      }[];
      expect(rows.map((r) => r.name)).toEqual(["first", "second"]);
    });
  });
});
