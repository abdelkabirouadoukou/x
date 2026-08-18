import { useCallback, useEffect, useState } from "react";

/**
 * SSR-safe localStorage-backed state. On the server (and before hydration)
 * the `initial` value is returned; after mount the stored value hydrates and
 * writes sync back. Cross-tab sync via the `storage` event.
 *
 * @param key Storage key.
 * @param initial Initial value used on the server and when nothing is stored.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  // Hydrate from localStorage on mount only — never during SSR render.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // Malformed/stale value or storage unavailable (private mode) — keep initial.
    }
  }, [key]);

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        setValue(e.newValue === null ? initial : (JSON.parse(e.newValue) as T));
      } catch {
        // ignore malformed event payloads
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, initial]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage full/unavailable — state still updates in memory
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
