import type { RefObject } from "react";
import { useEffect } from "react";

/**
 * Calls `handler` when a pointer-down happens outside the referenced element.
 * Common for dropdowns, modals, popovers. SSR-safe: only attaches the
 * listener after mount.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (e: PointerEvent) => void,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onPointerDown = (e: PointerEvent) => {
      if (el.contains(e.target as Node)) return;
      handler(e);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ref, handler]);
}
