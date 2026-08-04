"use client";

import { useEffect, useRef } from "react";

/**
 * Starfield Canvas — the interactive deep-space sky.
 *
 * Three depth layers of stars drifting at different speeds, twinkling
 * slightly, with a gentle mouse parallax so the sky leans into the cursor
 * like a planetarium. Rendered in pure white on vantablack.
 *
 * Rendered once per layout mount; skipped on reduced motion (the CSS
 * `.cosmos` starfield keeps the scene alive instead).
 */

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  tw: number;
  ph: number;
  color: string;
}

const LAYERS = [
  { count: 60, speed: 0.008, parallax: 6, baseR: 0.5 },
  { count: 45, speed: 0.016, parallax: 12, baseR: 0.8 },
  { count: 28, speed: 0.03, parallax: 22, baseR: 1.2 },
];

export default function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    const stars: Star[] = [];
    const pointer = { x: 0, y: 0 };

    const build = () => {
      stars.length = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const layer of LAYERS) {
        for (let i = 0; i < layer.count; i++) {
          stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: layer.parallax,
            r: layer.baseR * (0.6 + Math.random() * 0.9),
            tw: 0.02 + Math.random() * 0.05,
            ph: Math.random() * Math.PI * 2,
            color: Math.random() < 0.8 ? "#ffffff" : "#a1a1aa",
          });
        }
      }
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const px = (pointer.x / width - 0.5) * 2;
      const py = (pointer.y / height - 0.5) * 2;

      for (const s of stars) {
        const dx = s.x + px * s.z;
        const dy = s.y + py * s.z;
        const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.arc(dx, dy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => build();
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };

    build();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden="true" className="starfield-canvas">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
