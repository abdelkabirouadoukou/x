import { tracePhase } from "./observability/tracing";

export interface MiddlewareContext {
  params: Record<string, string>;
  request: Request;
}

export type MiddlewareNext = () => Promise<Response>;

export type MiddlewareFn = (ctx: MiddlewareContext, next: MiddlewareNext) => Promise<Response>;

export function composeMiddleware(
  fns: MiddlewareFn[],
  handler: (ctx: MiddlewareContext) => Promise<Response>,
): MiddlewareFn {
  return async (ctx, _next) => {
    let index = -1;
    const dispatch = async (i: number): Promise<Response> => {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      const fn = fns[i];
      if (fn) {
        return fn(ctx, () => dispatch(i + 1));
      }
      return handler(ctx);
    };
    // The composed chain (middleware onion + final handler) is one span so a
    // slow redirect / auth gate / body read shows up in the trace. Called
    // outside a traced request (e.g. standalone use) this is a no-op.
    return tracePhase("x.middleware", { route: new URL(ctx.request.url).pathname }, () =>
      dispatch(0),
    );
  };
}
