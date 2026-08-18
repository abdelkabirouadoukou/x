import { useEffect } from "react";

/**
 * Typed wrapper over addEventListener with automatic cleanup. SSR-safe: the
 * listener is only attached after mount, never during the server render pass.
 */
export function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  target: EventTarget | (() => EventTarget | null) = () => window,
  options?: AddEventListenerOptions,
): void {
  useEffect(() => {
    const el = typeof target === "function" ? target() : target;
    if (!el) return;
    const wrapped = (e: Event) => handler(e as WindowEventMap[K]);
    el.addEventListener(event, wrapped, options);
    return () => el.removeEventListener(event, wrapped, options);
  }, [event, handler, options, target]);
}
