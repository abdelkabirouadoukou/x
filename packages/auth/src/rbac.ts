/**
 * Role-based access control: pure role/permission checks over a session, plus
 * guard factories that plug into the framework's route middleware
 * (`export const middleware = ...` or `export const auth = ...`). All checks
 * are fail-closed: a `null` session (signed out) is `401`, and a session that
 * is authenticated but lacks the required role/permission is `403`.
 */

import type { MiddlewareFn } from "@thexjs/core";
import { auditPermissionDenied, clientIpFromRequest, requestIdFromRequest } from "@thexjs/core";
import type { Session } from "./types";

export type AuthGuardResult =
  | { ok: true }
  | {
      ok: false;
      /** 401 when signed out, 403 when signed in but unauthorized. */
      status: 401 | 403;
      reason: string;
    };

export type SessionGuard = (session: Session | null) => AuthGuardResult;

/** True when the session is present and carries `role`. */
export function hasRole(session: Session | null, role: string): boolean {
  return Array.isArray(session?.user.roles) && session.user.roles.includes(role);
}

/** True when the session is present and carries any of `roles`. */
export function hasAnyRole(session: Session | null, roles: string[]): boolean {
  if (session === null) return false;
  return roles.some((role) => hasRole(session, role));
}

/** True when the session is present and carries `permission`. */
export function hasPermission(session: Session | null, permission: string): boolean {
  return Array.isArray(session?.user.permissions) && session.user.permissions.includes(permission);
}

/** True when the session is present and carries every `permission`. */
export function hasAllPermissions(session: Session | null, permissions: string[]): boolean {
  if (session === null) return false;
  return permissions.every((permission) => hasPermission(session, permission));
}

/**
 * Fails closed: signed out → 401; signed in but missing any of the required
 * roles → 403. An empty `roles` list only requires an authenticated session.
 */
export function requireRole(...roles: string[]): SessionGuard {
  return (session) => {
    if (!session) return { ok: false, status: 401, reason: "Unauthorized" };
    if (roles.length === 0) return { ok: true };
    if (!hasAnyRole(session, roles)) {
      return { ok: false, status: 403, reason: "Forbidden" };
    }
    return { ok: true };
  };
}

/**
 * Fails closed: signed out → 401; signed in but missing every required
 * permission → 403. An empty `permissions` list only requires an
 * authenticated session.
 */
export function requirePermission(...permissions: string[]): SessionGuard {
  return (session) => {
    if (!session) return { ok: false, status: 401, reason: "Unauthorized" };
    if (permissions.length === 0) return { ok: true };
    if (!hasAllPermissions(session, permissions)) {
      return { ok: false, status: 403, reason: "Forbidden" };
    }
    return { ok: true };
  };
}

/** Requires a signed-in session; nothing more. */
export function requireAuth(): SessionGuard {
  return (session) => {
    if (!session) return { ok: false, status: 401, reason: "Unauthorized" };
    return { ok: true };
  };
}

export interface GuardMiddlewareOptions {
  /** When set, signed-out users get a 302 redirect here instead of a 401. */
  redirectTo?: string;
}

/**
 * Adapts a `SessionGuard` into framework route middleware that resolves the
 * session from the request (via `getSession`) and, on a failing check,
 * short-circuits with the guard's status (or a redirect). Returned by
 * `auth.guard(guard)` / `auth.requireRole(...)` / `auth.requirePermission(...)`.
 */
export function toMiddleware(
  getSession: (req: Request) => Promise<Session | null>,
  guard: SessionGuard,
  options: GuardMiddlewareOptions = {},
): MiddlewareFn {
  return async (ctx, next) => {
    const session = await getSession(ctx.request);
    const result = guard(session);
    if (result.ok) return next();
    // Permission-denied is worth an audit trail: signed-in user + role can't
    // do something. The session user id is the identity; IP comes from the
    // request. Failures carry enough context for a review or brute-force scan.
    const ip = clientIpFromRequest(ctx.request);
    const requestId = requestIdFromRequest(ctx.request);
    auditPermissionDenied({
      userId: session?.user.id ?? null,
      ip,
      ...(requestId !== undefined ? { requestId } : {}),
      reason: result.reason,
    });
    if (options.redirectTo && result.status === 401) {
      return new Response(null, {
        status: 302,
        headers: { Location: options.redirectTo },
      });
    }
    return new Response(result.reason, {
      status: result.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  };
}
