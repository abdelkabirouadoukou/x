"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Typing Terminal — the hero's live code window.
 *
 * A glassmorphism terminal (macOS traffic lights, mono text, cyan prompt)
 * that types its command output one character at a time with a blinking
 * block cursor, then loops. Runs entirely client-side with a small
 * requestAnimationFrame/timer scheduler — no GSAP needed here, the typing
 * reads as a live instrument rather than a motion graphic.
 */

interface Line {
  kind: "prompt" | "cmd" | "ok" | "out" | "dim";
  text: string;
}

const SCRIPT: Line[] = [
  { kind: "prompt", text: "$ bun create thexjs-app@latest my-app" },
  { kind: "ok", text: "✔ Scaffolding project from template 'basic'…" },
  { kind: "out", text: "  pages/  api/  actions/  content/  src/styles/" },
  { kind: "ok", text: "✔ Installed 214 dependencies in 2.1s" },
  { kind: "prompt", text: "$ bun run dev" },
  { kind: "ok", text: "[x] dev server running at http://localhost:3000" },
  { kind: "dim", text: "[x] watching src/pages/** · file-based routing ready" },
  { kind: "dim", text: "[x] SSR + static prerender · one Bun process · island hydration on" },
];

const CHAR_MS = 16;
const LINE_PAUSE_MS = 380;
const END_PAUSE_MS = 2600;

const LINE_STYLES: Record<Line["kind"], { color: string }> = {
  prompt: { color: "var(--code-keyword)" },
  cmd: { color: "var(--terminal-text)" },
  ok: { color: "var(--code-string)" },
  out: { color: "var(--code-property)" },
  dim: { color: "var(--code-comment)" },
};

export default function TypingTerminal() {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const line = SCRIPT[lineIdx];
      if (!line) {
        timer.current = setTimeout(() => {
          setLineIdx(0);
          setCharIdx(0);
          timer.current = setTimeout(tick, CHAR_MS);
        }, END_PAUSE_MS);
        return;
      }

      const nextChar = charIdx + 1;
      const done = nextChar >= line.text.length;
      setCharIdx(done ? 0 : nextChar);
      setLineIdx(done ? lineIdx + 1 : lineIdx);

      timer.current = setTimeout(tick, done ? LINE_PAUSE_MS : CHAR_MS);
    };

    timer.current = setTimeout(tick, 300);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [charIdx, lineIdx]);

  return (
    <div className="code-block-glass relative overflow-hidden rounded-2xl text-left">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#71717a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#52525b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#3f3f46]" />
        </div>
        <span
          className="truncate font-mono text-[11px] tracking-wide"
          style={{ color: "var(--code-comment)" }}
        >
          ~/my-app — x dev
        </span>
        <span className="hidden w-12 sm:block" />
      </div>

      <div className="relative overflow-x-auto p-5 font-mono text-[13px] leading-[1.65]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)",
          }}
        />
        {SCRIPT.slice(0, lineIdx).map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static const list, stable order, never reordered
          <div key={i} className="whitespace-pre">
            {line.kind === "prompt" && <span style={LINE_STYLES.prompt}>$ </span>}
            <span style={LINE_STYLES[line.kind]}>{line.text}</span>
          </div>
        ))}
        {SCRIPT[lineIdx] && (
          <div className="whitespace-pre">
            {SCRIPT[lineIdx].kind === "prompt" && <span style={LINE_STYLES.prompt}>$ </span>}
            <span style={LINE_STYLES[SCRIPT[lineIdx].kind]}>
              {SCRIPT[lineIdx].text.slice(0, charIdx)}
            </span>
          </div>
        )}
        <div className="whitespace-pre">
          <span className="type-cursor" />
        </div>
      </div>
    </div>
  );
}
