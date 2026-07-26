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
    return dispatch(0);
  };
}
