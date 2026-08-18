import { useCallback, useState } from "react";

export interface ServerActionState<TData> {
  data: TData | null;
  error: string | null;
  isPending: boolean;
}

export type ServerActionRun<TData, Args extends unknown[]> = (
  ...args: Args
) => Promise<TData | null>;

export type ServerActionResult<TData, Args extends unknown[]> = [
  ServerActionState<TData>,
  ServerActionRun<TData, Args>,
];

/**
 * Mutation-hook ergonomics over the framework's server-function RPC client.
 * Pass a server function (from the generated `src/x-actions` client or
 * `generateServerFunctionClient` output) and get `{ data, error, isPending }`
 * plus a `run` function. SSR-safe — it only touches fetch on `run`, never
 * during the render pass.
 */
export function useServerAction<Args extends unknown[] = never[], TData = unknown>(
  fn: (...args: Args) => Promise<TData>,
): ServerActionResult<TData, Args> {
  const [state, setState] = useState<ServerActionState<TData>>({
    data: null,
    error: null,
    isPending: false,
  });

  const run = useCallback(
    async (...args: Args) => {
      setState((s) => ({ ...s, isPending: true, error: null }));
      try {
        const data = await fn(...args);
        setState({ data, error: null, isPending: false });
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ data: null, error: message, isPending: false });
        return null;
      }
    },
    [fn],
  );

  return [state, run];
}
