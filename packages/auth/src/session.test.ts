import { afterAll, describe, expect, test } from "bun:test";
import { connectPostgres, connectSQLite } from "@thexjs/core/data";
import { createPostgresSessionStore, createSQLiteSessionStore } from "./session";
import type { AuthUser, Session } from "./types";

const now = Date.now();

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    token: "tok_" + Math.random().toString(36).slice(2),
    userId: "user_1",
    provider: "github",
    user: { id: "user_1", email: "a@b.com" } as AuthUser,
    expiresAt: now + 3_600_000,
    createdAt: now,
    ...overrides,
  };
}

describe("SQLite session store — created_at preserved on upsert", () => {
  const db = connectSQLite({ path: ":memory:" });
  const store = createSQLiteSessionStore({ db });

  afterAll(() => db.close());

  test("created_at is not overwritten when re-creating the same token", async () => {
    const session = baseSession();
    await store.create(session);

    const found = await store.find(session.token);
    expect(found?.createdAt).toBe(session.createdAt);

    // Re-create with the same token but updated user data
    await store.create({ ...session, user: { id: "user_1", email: "b@c.com" } as AuthUser });

    const found2 = await store.find(session.token);
    expect(found2?.createdAt).toBe(session.createdAt);
    expect(found2?.user?.email).toBe("b@c.com");
  });
});

(process.env.DATABASE_URL ? describe : describe.skip)(
  "Postgres session store — created_at preserved on upsert",
  () => {
    let store: ReturnType<typeof createPostgresSessionStore>;

    async function getStore() {
      if (!store) {
        store = createPostgresSessionStore(connectPostgres({ url: process.env.DATABASE_URL! }));
      }
      return store;
    }

    test("created_at is not overwritten when re-creating the same token", async () => {
      const s = await getStore();
      const session = baseSession();
      await s.create(session);

      const found = await s.find(session.token);
      expect(found?.createdAt).toBe(session.createdAt);

      await s.create({ ...session, user: { id: "user_1", email: "b@c.com" } as AuthUser });

      const found2 = await s.find(session.token);
      expect(found2?.createdAt).toBe(session.createdAt);
      expect(found2?.user?.email).toBe("b@c.com");
    });
  },
);
