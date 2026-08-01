import type { Database } from "bun:sqlite";
// DEMO ONLY: hardcoded admin/admin credentials, plaintext password comparison,
// no session expiry. This auth is a placeholder for demos — replace with real
// credential storage (hashed passwords) before shipping anything production.
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { connectSQLite, runSQLiteMigrations } from "@thexjs/core/data";

const SESSION_COOKIE = "x_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface Session {
  id: string;
  token: string;
  user_id: string;
  username: string;
}

let db: Database | null = null;

function getDb(): Database {
  if (db) return db;
  const dbPath = join(import.meta.dir, "..", "..", "data", "dev.db");
  mkdirSync(dirname(dbPath), { recursive: true });
  db = connectSQLite({ path: dbPath });
  runSQLiteMigrations(db, join(import.meta.dir, "migrations"));
  return db;
}

export function createSession(username: string): Session {
  const db = getDb();
  const id = randomUUID();
  const token = randomUUID();
  const userId = `user_${randomUUID().slice(0, 8)}`;

  db.run("INSERT INTO sessions (id, token, user_id, username) VALUES (?1, ?2, ?3, ?4)", [
    id,
    token,
    userId,
    username,
  ] as unknown as string[]);

  return { id, token, user_id: userId, username };
}

// DEMO ONLY: the single source of truth for the credential check, shared by
// the login API route and the login page's server fallback. Replace this with
// real (hashed) password verification before shipping.
export function authenticate(email: string, password: string): Session | null {
  if (email === "admin" && password === "admin") {
    return createSession(email);
  }
  return null;
}

export function getSession(token: string | undefined): Session | null {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id, token, user_id, username FROM sessions WHERE token = ?1")
    .get(token) as { id: string; token: string; user_id: string; username: string } | null;
  if (!row) return null;
  return { id: row.id, token: row.token, user_id: row.user_id, username: row.username };
}

export function deleteSession(token: string): void {
  const db = getDb();
  db.run("DELETE FROM sessions WHERE token = ?1", [token] as unknown as string[]);
}

export function parseSessionCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE}=`)) {
      return trimmed.slice(SESSION_COOKIE.length + 1);
    }
  }
  return undefined;
}

const SECURE_COOKIE_FLAG = process.env.NODE_ENV === "production" ? "; Secure" : "";

export function setSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${SECURE_COOKIE_FLAG}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${SECURE_COOKIE_FLAG}`;
}
