import { useEffect, useState } from "react";

/**
 * Returns `value` after it has stopped changing for `delayMs`. Classic
 * debounce for search inputs, resize handlers, etc. SSR-safe: the initial
 * value renders identically on server and client (no window access).
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
