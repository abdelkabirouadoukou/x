import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { SESSION_COOKIE, defineAuth } from "./auth";
import {
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
});

describe("guards", () => {
  test("requireRole fails closed on a signed-out session (401)", () => {
    const result = requireRole("admin")(null);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  test("requireRole allows an authenticated user with the role", () => {
    const result = requireRole("admin")(sessionWith(["admin"]));
    expect(result.ok).toBe(true);
  });

  test("requireRole rejects an authenticated user without the role (403)", () => {
    const result = requireRole("admin")(sessionWith(["editor"]));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
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
    expect(requirePermission("posts:write")(null).status).toBe(401);
    expect(requirePermission("posts:write")(sessionWith([], ["posts:write"])).ok).toBe(true);
    expect(
      requirePermission("posts:read", "posts:write")(sessionWith([], ["posts:read"])).status,
    ).toBe(403);
  });

  test("requireAuth only checks authentication", () => {
    expect(requireAuth()(sessionWith()).ok).toBe(true);
    expect(requireAuth()(null).status).toBe(401);
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
    const cookie = res.headers.getSetCookie()[0]?.split(";")[0] as string;

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
    const cookie = res.headers.getSetCookie()[0]?.split(";")[0] as string;
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
    const cookie = res.headers.getSetCookie()[0]?.split(";")[0] as string;
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
