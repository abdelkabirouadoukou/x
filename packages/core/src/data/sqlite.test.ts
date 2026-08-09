import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { connectSQLite } from "./sqlite";

// Real-connection coverage for connectSQLite()'s option handling. The
// connection options own the WAL journaling and foreign-key pragmas, so these
// tests open a scratch database file and read the live PRAGMA values back
// rather than asserting what `run()` *would* execute. WAL needs a real file
// (a ":memory:" database can't switch to WAL journaling), hence the temp DB.
const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/sqlite-conn");

function pragmaValue(db: Database, pragma: string): string {
  const row = db.query(`PRAGMA ${pragma}`).get() as Record<string, string> | null;
  return row ? String(Object.values(row)[0]) : "";
}

function journalMode(db: Database): string {
  return pragmaValue(db, "journal_mode").toLowerCase();
}

function foreignKeys(db: Database): number {
  return Number(pragmaValue(db, "foreign_keys"));
}

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("connectSQLite connection options", () => {
  test("defaults to WAL journal mode", () => {
    const db = connectSQLite({ path: join(FIXTURE_DIR, "wal.db") });
    expect(journalMode(db)).toBe("wal");
    db.close();
  });

  test("defaults to foreign keys enabled", () => {
    const db = connectSQLite({ path: join(FIXTURE_DIR, "fk.db") });
    expect(foreignKeys(db)).toBe(1);
    db.close();
  });

  test("wal: false leaves journaling off WAL", () => {
    const db = connectSQLite({ path: join(FIXTURE_DIR, "no-wal.db"), wal: false });
    expect(journalMode(db)).not.toBe("wal");
    db.close();
  });

  test("foreignKeys: false disables FK enforcement", () => {
    const db = connectSQLite({ path: join(FIXTURE_DIR, "no-fk.db"), foreignKeys: false });
    expect(foreignKeys(db)).toBe(0);
    db.close();
  });

  test("opting out of WAL keeps foreign keys on", () => {
    const db = connectSQLite({ path: join(FIXTURE_DIR, "wal-off.db"), wal: false });
    expect(foreignKeys(db)).toBe(1);
    db.close();
  });

  test("with foreign keys on, an orphan INSERT is rejected", () => {
    const db = connectSQLite({ path: join(FIXTURE_DIR, "fk-enforced.db") });
    db.run("CREATE TABLE parent (id INTEGER PRIMARY KEY)");
    db.run("CREATE TABLE child (parent_id INTEGER REFERENCES parent(id))");
    expect(() => db.run("INSERT INTO child (parent_id) VALUES (999)")).toThrow();
    db.close();
  });

  test("with foreign keys off, an orphan INSERT succeeds", () => {
    const db = connectSQLite({ path: join(FIXTURE_DIR, "fk-off.db"), foreignKeys: false });
    db.run("CREATE TABLE parent (id INTEGER PRIMARY KEY)");
    db.run("CREATE TABLE child (parent_id INTEGER REFERENCES parent(id))");
    expect(() => db.run("INSERT INTO child (parent_id) VALUES (999)")).not.toThrow();
    db.close();
  });
});
