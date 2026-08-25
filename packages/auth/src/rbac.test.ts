import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { defineAuth, SESSION_COOKIE } from "./auth";
import {
  type AuthGuardResult,
  hasAllPermissions,
  hasAnyRole,
  hasPermission,
  hasRole,
  requireAuth,
  requirePermission,
  requireRole,
} from "./rbac";
import { createSQLiteSessionStore } from "./session";
import type { AuthUser, Session } from "./types";

function sessionWith(roles: string[] = [], permissions: string[] = []): Session {
  const user: AuthUser = { id: "u_1", name: "Admin", email: "admin@example.com" };
  if (roles.length > 0) user.roles = roles;
  if (permissions.length > 0) user.permissions = permissions;
  return {
    token: "token",
    userId: "u_1",
    provider: "local",
    expiresAt: Date.now() + 60_000,
    createdAt: Date.now(),
    user,
  };
}

function extractCookie(res: Response, name: string): string | null {
  const cookies = res.headers.getSetCookie();
  for (const c of cookies) {
    const first = c.split(";")[0] ?? "";
    const eq = first.indexOf("=");
    if (eq !== -1 && first.slice(0, eq) === name) return first.slice(eq + 1);
  }
  return null;
}

/** The full `x_session=...` cookie header from a setSessionCookie response. */
function requireSessionCookie(res: Response): string {
  const cookie = extractCookie(res, SESSION_COOKIE);
  if (cookie === null) throw new Error("expected a session cookie in the response");
  return `${SESSION_COOKIE}=${cookie}`;
}

describe("role checks", () => {
  test("hasRole is true only when the role is present", () => {
    expect(hasRole(sessionWith(["admin"]), "admin")).toBe(true);
    expect(hasRole(sessionWith(["admin"]), "editor")).toBe(false);
    expect(hasRole(sessionWith(), "admin")).toBe(false);
    expect(hasRole(null, "admin")).toBe(false);
  });

  test("hasAnyRole matches any of the given roles", () => {
    const session = sessionWith(["editor", "admin"]);
    expect(hasAnyRole(session, ["admin"])).toBe(true);
    expect(hasAnyRole(session, ["admin", "viewer"])).toBe(true);
    expect(hasAnyRole(session, ["viewer", "moderator"])).toBe(false);
  });

  test("hasPermission is true only when the permission is present", () => {
    expect(hasPermission(sessionWith([], ["posts:write"]), "posts:write")).toBe(true);
    expect(hasPermission(sessionWith([], ["posts:write"]), "posts:delete")).toBe(false);
  });

  test("hasAllPermissions requires every permission", () => {
    const session = sessionWith([], ["posts:read", "posts:write"]);
    expect(hasAllPermissions(session, ["posts:read", "posts:write"])).toBe(true);
    expect(hasAllPermissions(session, ["posts:read", "posts:delete"])).toBe(false);
  });

  test("a null session fails closed even with an empty list", () => {
    expect(hasAllPermissions(null, [])).toBe(false);
    expect(hasAnyRole(null, [])).toBe(false);
    expect(hasPermission(null, "")).toBe(false);
    expect(hasRole(null, "")).toBe(false);
  });
});

describe("guards", () => {
  test("requireRole fails closed on a signed-out session (401)", () => {
    const result = requireRole("admin")(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  test("requireRole allows an authenticated user with the role", () => {
    const result = requireRole("admin")(sessionWith(["admin"]));
    expect(result.ok).toBe(true);
  });

  test("requireRole rejects an authenticated user without the role (403)", () => {
    const result = requireRole("admin")(sessionWith(["editor"]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  test("requireRole accepts multiple roles (any-match)", () => {
    expect(requireRole("admin", "moderator")(sessionWith(["moderator"])).ok).toBe(true);
    expect(requireRole("admin", "moderator")(sessionWith(["editor"])).ok).toBe(false);
  });

  test("requireRole with no roles only requires authentication", () => {
    expect(requireRole()(sessionWith()).ok).toBe(true);
    expect(requireRole()(null).ok).toBe(false);
  });

  test("requirePermission fails closed and requires every permission", () => {
    const r1 = requirePermission("posts:write")(null);
    if (!r1.ok) expect(r1.status).toBe(401);
    expect(requirePermission("posts:write")(sessionWith([], ["posts:write"])).ok).toBe(true);
    const r2 = requirePermission("posts:read", "posts:write")(sessionWith([], ["posts:read"]));
    if (!r2.ok) expect(r2.status).toBe(403);
  });

  test("requireAuth only checks authentication", () => {
    expect(requireAuth()(sessionWith()).ok).toBe(true);
    const result = requireAuth()(null);
    if (!result.ok) expect(result.status).toBe(401);
  });

  test("AuthGuardResult is a discriminated union (type-level exhaustiveness)", () => {
    function assertUnion(result: AuthGuardResult) {
      if (result.ok) return;
      const _: 401 | 403 = result.status;
    }
    // Runtime no-op; the assertion is that tsc accepts the narrow
    assertUnion(requireAuth()(sessionWith()));
    assertUnion(requireAuth()(null));
    expect(true).toBe(true);
  });
});

describe("middleware guards", () => {
  test("a guard short-circuits with 401 when signed out", async () => {
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db: new Database(":memory:") }),
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize() {
            return null;
          },
        },
      ],
    });

    const middleware = auth.requireRole("admin");
    const res = await middleware(
      { params: {}, request: new Request("http://localhost/admin") },
      async () => new Response("ok"),
    );
    expect(res.status).toBe(401);
  });

  test("a redirectTo option redirects signed-out users", async () => {
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db: new Database(":memory:") }),
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize() {
            return null;
          },
        },
      ],
    });

    const middleware = auth.requireRole("admin", { redirectTo: "/login" });
    const res = await middleware(
      { params: {}, request: new Request("http://localhost/admin") },
      async () => new Response("ok"),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });

  test("passes through to next() for an authorized request", async () => {
    const store = createSQLiteSessionStore({ db: new Database(":memory:") });
    const auth = defineAuth({
      secret: "test-secret",
      store,
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize() {
            return { id: "u_1", roles: ["admin"] };
          },
        },
      ],
    });

    const res = await auth.setSessionCookie(
      new Response(null),
      { id: "u_1", roles: ["admin"] },
      "local",
    );
    const cookie = requireSessionCookie(res);

    const middleware = auth.requireRole("admin");
    const next = await middleware(
      { params: {}, request: new Request("http://localhost/admin", { headers: { cookie } }) },
      async () => new Response("ok"),
    );
    expect(next.status).toBe(200);
    expect(await next.text()).toBe("ok");
  });

  test("resolveRoles grants roles snapshotted into the session", async () => {
    const db = new Database(":memory:");
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      resolveRoles: async () => ({ roles: ["admin"], permissions: ["posts:write"] }),
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize() {
            return { id: "u_1", email: "admin@example.com" };
          },
        },
      ],
    });

    const res = await auth.setSessionCookie(new Response(null), { id: "u_1" }, "local");
    const cookie = requireSessionCookie(res);
    const session = await auth.getSession(
      new Request("http://localhost/", { headers: { cookie } }),
    );
    expect(session?.user.roles).toEqual(["admin"]);
    expect(session?.user.permissions).toEqual(["posts:write"]);

    const middleware = auth.requireRole("admin");
    const next = await middleware(
      { params: {}, request: new Request("http://localhost/admin", { headers: { cookie } }) },
      async () => new Response("ok"),
    );
    expect(next.status).toBe(200);
  });

  test("session snapshot is immune to later source-array mutation (fallback path)", async () => {
    const db = new Database(":memory:");
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize() {
            return { id: "u_1", roles: ["admin"], permissions: ["posts:write"] };
          },
        },
      ],
    });

    const user = { id: "u_1", roles: ["admin"], permissions: ["posts:write"] };
    const res = await auth.setSessionCookie(new Response(null), user, "local");
    const cookie = requireSessionCookie(res);

    user.roles.push("root");
    user.permissions.pop();

    const session = await auth.getSession(
      new Request("http://localhost/", { headers: { cookie } }),
    );
    expect(session?.user.roles).toEqual(["admin"]);
    expect(session?.user.permissions).toEqual(["posts:write"]);
  });

  test("session snapshot is immune to later resolver-result mutation", async () => {
    const db = new Database(":memory:");
    const granted = { roles: ["admin"], permissions: ["posts:write"] };
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      resolveRoles: async () => granted,
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize() {
            return { id: "u_1", email: "admin@example.com" };
          },
        },
      ],
    });

    const res = await auth.setSessionCookie(new Response(null), { id: "u_1" }, "local");
    const cookie = requireSessionCookie(res);

    granted.roles.push("root");
    granted.permissions.pop();

    const session = await auth.getSession(
      new Request("http://localhost/", { headers: { cookie } }),
    );
    expect(session?.user.roles).toEqual(["admin"]);
    expect(session?.user.permissions).toEqual(["posts:write"]);
  });

  test("roles come from the provider's user when no resolveRoles hook is set", async () => {
    const db = new Database(":memory:");
    const auth = defineAuth({
      secret: "test-secret",
      store: createSQLiteSessionStore({ db }),
      providers: [
        {
          id: "local",
          name: "Local",
          type: "credentials",
          async authorize() {
            return { id: "u_1", roles: ["editor"] };
          },
        },
      ],
    });

    const res = await auth.setSessionCookie(
      new Response(null),
      { id: "u_1", roles: ["editor"] },
      "local",
    );
    const cookie = requireSessionCookie(res);
    const session = await auth.getSession(
      new Request("http://localhost/", { headers: { cookie } }),
    );
    expect(session?.user.roles).toEqual(["editor"]);
    expect(session?.user.permissions).toBeUndefined();

    const middleware = auth.requirePermission("posts:write");
    const next = await middleware(
      { params: {}, request: new Request("http://localhost/admin", { headers: { cookie } }) },
      async () => new Response("ok"),
    );
    expect(next.status).toBe(403);
  });

  test("SESSION_COOKIE import is stable", () => {
    expect(SESSION_COOKIE).toBe("x_session");
  });
});
