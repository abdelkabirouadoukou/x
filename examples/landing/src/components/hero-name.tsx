import { type CSSProperties, useEffect, useRef } from "react";

/**
 * Variable-font proximity wordmark.
 *
 * Each glyph's weight + width reacts to how close the pointer is (Archivo ships
 * wght 100–900 and wdth 62–125). A fit pass measures the WIDEST possible state
 * and scales the font so the word can never overflow its column, whatever font
 * actually loaded. Touch + reduced-motion users get a static, balanced state.
 */
const REST = { w: 560, wd: 108 };
const MAX = { w: 900, wd: 125 };
const STATIC = { w: 780, wd: 110 };
const RADIUS = 260;

interface Props {
  text?: string;
  /** Glyph indexes that take the accent colour (the "x"). */
  accent?: number[];
}

/* Island props are not serialised to the client, so the defaults ARE the content. */
export default function HeroName({ text = "thexjs", accent = [3] }: Props) {
  const root = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const chars = Array.from(el.querySelectorAll<HTMLElement>(".lp-ch"));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

    const set = (c: HTMLElement, w: number, wd: number) => {
      c.style.fontVariationSettings = `"wght" ${w.toFixed(0)}, "wdth" ${wd.toFixed(0)}`;
    };
    const setAll = (w: number, wd: number) => {
      for (const c of chars) set(c, w, wd);
    };

    let lastW = -1;
    const fit = (force = true) => {
      const avail = el.clientWidth - 2;
      if (!force && Math.abs(avail - lastW) < 1) return;
      lastW = avail;
      el.style.fontSize = "";
      setAll(MAX.w, MAX.wd);
      el.style.width = "max-content";
      const widest = el.scrollWidth;
      el.style.width = "";
      const current = Number.parseFloat(getComputedStyle(el).fontSize);
      if (widest > avail && avail > 80) el.style.fontSize = `${(current * avail) / widest}px`;
      const base = reduce || !fine ? STATIC : REST;
      setAll(base.w, base.wd);
    };

    const ro = new ResizeObserver(() => fit(false));
    ro.observe(el);
    document.fonts?.ready.then(() => fit(true));
    fit(true);

    if (reduce || !fine) return () => ro.disconnect();

    let px = -9999;
    let py = -9999;
    let raf = 0;
    let active = false;
    const eased = chars.map(() => 0);

    const tick = () => {
      let moving = false;
      chars.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const target = Math.max(0, 1 - d / RADIUS) ** 1.6;
        const prev = eased[i] ?? 0;
        const next = prev + (target - prev) * 0.14;
        eased[i] = next;
        if (Math.abs(target - next) > 0.004) moving = true;
        set(c, REST.w + (MAX.w - REST.w) * next, REST.wd + (MAX.wd - REST.wd) * next);
      });
      raf = moving || active ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      active = true;
      kick();
    };
    const leave = () => {
      px = py = -9999;
      active = false;
      kick();
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <p className="lp-mark" ref={root} aria-hidden="true">
      {Array.from(text).map((ch, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: static glyph list
          key={i}
          className={`lp-ch${accent.includes(i) ? " is-x" : ""}`}
          style={{ "--c": i } as CSSProperties}
        >
          {ch}
        </span>
      ))}
    </p>
  );
}
