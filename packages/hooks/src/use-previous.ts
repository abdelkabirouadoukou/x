import { useEffect, useRef } from "react";

/**
 * Returns the value from the previous render. Empty/initial renders return
 * `undefined`. SSR-safe — it is a pure ref bookkeeping hook.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
