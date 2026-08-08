import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSQLiteMigrations } from "./migrate";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/migrations");

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
