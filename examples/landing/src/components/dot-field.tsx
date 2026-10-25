import { useEffect, useRef } from "react";

/**
 * Interactive dot grid. Dots are pushed away from the pointer by a spring and
 * pick up the green accent as they move. Idle: a slow travelling wave so the
 * hero never feels dead. Pauses off-screen; static under reduced motion.
 */
const GAP = 28;
const RADIUS = 160;

export default function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--c-fg").trim() || "#0a0a0a";
    const green = css.getPropertyValue("--c-accent").trim() || "#009150";

    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    // x offset, y offset, x velocity, y velocity per dot (interleaved)
    let s = new Float32Array(0);
    let px = -9999;
    let py = -9999;
    let pvx = 0;
    let pvy = 0;
    let lastX = 0;
    let lastY = 0;
    let raf = 0;
    let visible = true;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = (j * cols + i) * 4;
          let ox = s[k] ?? 0;
          let oy = s[k + 1] ?? 0;
          let vx = s[k + 2] ?? 0;
          let vy = s[k + 3] ?? 0;
          const bx = i * GAP;
          const by = j * GAP;
          if (!reduce) {
            const dx = bx + ox - px;
            const dy = by + oy - py;
            const d2 = dx * dx + dy * dy;
            if (d2 < RADIUS * RADIUS) {
              const d = Math.sqrt(d2) || 1;
              const f = (1 - d / RADIUS) ** 2;
              vx += (dx / d) * f * 5 + pvx * f * 0.06;
              vy += (dy / d) * f * 5 + pvy * f * 0.06;
            }
            vx = (vx - ox * 0.07) * 0.84;
            vy = (vy - oy * 0.07) * 0.84;
            ox += vx;
            oy += vy;
            s[k] = ox;
            s[k + 1] = oy;
            s[k + 2] = vx;
            s[k + 3] = vy;
          }
          const wave = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.0009 + i * 0.33 + j * 0.21);
          const disp = Math.min(1, Math.hypot(ox, oy) / 26);
          ctx.globalAlpha = 0.14 + wave * 0.12 + disp * 0.75;
          ctx.fillStyle = disp > 0.12 ? green : ink;
          ctx.beginPath();
          ctx.arc(bx + ox, by + oy, 1 + wave * 0.8 + disp * 2.6, 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      pvx *= 0.8;
      pvy *= 0.8;
    };

    const size = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      s = new Float32Array(cols * rows * 4);
      if (reduce) draw(0);
    };

    const loop = (t: number) => {
      if (visible) draw(t);
      raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
      pvx = px - lastX;
      pvy = py - lastY;
      lastX = px;
      lastY = py;
    };
    const leave = () => {
      px = py = -9999;
    };

    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
    });
    io.observe(cv);
    if (!reduce) {
      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerleave", leave);
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <canvas className="lp-dots" ref={ref} />;
}
