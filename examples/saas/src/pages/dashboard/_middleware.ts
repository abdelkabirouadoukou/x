import type { MiddlewareContext, MiddlewareNext } from "@thexjs/core";
import { getSession, parseSessionCookie } from "../../lib/auth";

export function middleware(ctx: MiddlewareContext, next: MiddlewareNext) {
  const token = parseSessionCookie(ctx.request.headers.get("Cookie"));
  const session = getSession(token);
  if (!session) return new Response(null, { status: 302, headers: { Location: "/login" } });
  return next();
}
