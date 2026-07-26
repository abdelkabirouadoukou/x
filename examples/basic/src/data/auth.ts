import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { connectSQLite, runSQLiteMigrations } from "@x/core";

const SESSION_COOKIE = "x_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface Session {
  id: string;
  user_id: string;
  username: string;
}

function getDb() {
  const dbPath = join(import.meta.dir, "..", "..", "data", "dev.db");
  const db = connectSQLite({ path: dbPath });
  runSQLiteMigrations(db, join(import.meta.dir, "..", "..", "data", "migrations"));
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

  return { id, user_id: userId, username };
}

export function getSession(token: string | undefined): Session | null {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id, user_id, username FROM sessions WHERE token = ?1")
    .get(token) as { id: string; user_id: string; username: string } | null;
  if (!row) return null;
  return { id: row.id, user_id: row.user_id, username: row.username };
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

export function setSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
