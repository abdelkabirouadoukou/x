"use client";

import { useEffect, useRef } from "react";

/**
 * Custom cursor — a soft white glow that trails the pointer.
 *
 * A large radial glow eases behind the pointer with GSAP quickTo (lerped,
 * so it reads as a trail rather than a tracking dot), plus a crisp white
 * core that tracks the pointer exactly. Both are pointer-events-none and
 * sit above content; the native cursor is left in place so focus rings and
 * text selection still behave normally.
 *
 * Skipped on coarse pointers (touch) and when reduced motion is on.
 */
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      const glow = glowRef.current;
      const core = coreRef.current;
      if (!glow || !core) return;

      gsap.set([glow, core], { x: -1000, y: -1000 });

      const glowX = gsap.quickTo(glow, "x", { duration: 0.9, ease: "power3.out" });
      const glowY = gsap.quickTo(glow, "y", { duration: 0.9, ease: "power3.out" });
      const coreX = gsap.quickTo(core, "x", { duration: 0.12, ease: "power2.out" });
      const coreY = gsap.quickTo(core, "y", { duration: 0.12, ease: "power2.out" });

      const onMove = (e: PointerEvent) => {
        glowX(e.clientX);
        glowY(e.clientY);
        coreX(e.clientX);
        coreY(e.clientY);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        gsap.killTweensOf([glow, core]);
      };
    })();

    return () => cleanup?.();
  }, []);

  return (
    <>
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <div ref={coreRef} className="cursor-core" aria-hidden="true" />
    </>
  );
}
