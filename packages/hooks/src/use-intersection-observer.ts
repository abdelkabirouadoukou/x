import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

export interface IntersectionObserverOptions extends IntersectionObserverInit {
  /** Whether to keep observing after the first intersection. Default: false. */
  once?: boolean;
}

/**
 * Tracks whether the element referenced by `ref` is intersecting the
 * viewport. SSR-safe: returns `false` on the server (no window access), and
 * only starts observing after mount.
 */
export function useIntersectionObserver<T extends Element>(
  ref: RefObject<T | null>,
  options: IntersectionObserverOptions = {},
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const onceRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (options.once && onceRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          setEntry(e);
          if (options.once && e.isIntersecting) {
            onceRef.current = true;
            observer.disconnect();
          }
        }
      },
      {
        root: options.root ?? null,
        rootMargin: options.rootMargin ?? "0px",
        threshold: options.threshold ?? 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, options.once, options.root, options.rootMargin, options.threshold]);

  return entry;
}
