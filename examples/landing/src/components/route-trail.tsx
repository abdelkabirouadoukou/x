"use client";

import { useEffect, useRef } from "react";

/**
 * Route Trail
 *
 * Drops a small pin every time the pointer moves far enough inside the
 * wrapped area, then lets CSS fade & shrink it out. The effect reads as
 * "this hero is a map and your cursor is surveying it" — it's built out of
 * the same pin-marker language as the ticket/route-line motifs elsewhere on
 * the page instead of being a generic mouse-glow gimmick.
 *
 * Pure DOM, no React state per pin (state churn on mousemove would be a
 * pointless re-render storm) — nodes are created, appended, and removed by
 * a timeout. Capped at a handful of live pins so it never gets noisy.
 */
const MIN_DISTANCE = 26;
const MAX_LIVE_PINS = 14;
const PIN_LIFETIME_MS = 1100;

export default function RouteTrail() {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const live = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // skip on touch

    function onMove(e: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      const prev = last.current;
      if (prev) {
        const dx = x - prev.x;
        const dy = y - prev.y;
        if (Math.hypot(dx, dy) < MIN_DISTANCE) return;
      }
      last.current = { x, y };

      const pin = document.createElement("span");
      pin.className = "route-pin-drop";
      pin.style.left = `${x}px`;
      pin.style.top = `${y}px`;
      pin.style.transform = "translate(-50%, -50%)";
      el!.appendChild(pin);
      live.current.push(pin);

      if (live.current.length > MAX_LIVE_PINS) {
        const stale = live.current.shift();
        stale?.remove();
      }

      window.setTimeout(() => {
        pin.remove();
        live.current = live.current.filter((p) => p !== pin);
      }, PIN_LIFETIME_MS);
    }

    // Listen on window rather than the (pointer-events-none) overlay itself —
    // the overlay must stay click-through so it never eats clicks on the
    // hero's real buttons/inputs, so we hit-test against its rect instead.
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      live.current.forEach((p) => p.remove());
      live.current = [];
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 [&>*]:pointer-events-none"
    />
  );
}
