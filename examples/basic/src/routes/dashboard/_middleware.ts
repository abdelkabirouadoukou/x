import type { MiddlewareContext, MiddlewareFn } from "@x/core";
import { getSession, parseSessionCookie } from "../../data/auth";

export const middleware: MiddlewareFn = async (ctx: MiddlewareContext, next) => {
  const token = parseSessionCookie(ctx.request.headers.get("Cookie"));
  const session = getSession(token);

  if (!session) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  return next();
};
