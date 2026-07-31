"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "building" | "ready" | "shipped" | "early";

const BEST_KEY = "x-ship-it-best-ms";

function loadBest(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(BEST_KEY);
  return raw ? Number(raw) : null;
}

function verdict(ms: number): string {
  if (ms < 150) return "Faster than the paint frame. Suspicious.";
  if (ms < 300) return "Faster than a cold start on most stacks.";
  if (ms < 600) return "Solid — quicker than waiting on a container to spin up.";
  return "Shipped. The build was ready before you were.";
}

export default function ShipIt() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const readyAt = useRef<number>(0);
  const timeoutId = useRef<number | undefined>(undefined);

  useEffect(() => {
    setBest(loadBest());
    return () => window.clearTimeout(timeoutId.current);
  }, []);

  function start() {
    setElapsed(null);
    setPhase("building");
    const delay = 900 + Math.random() * 1600;
    timeoutId.current = window.setTimeout(() => {
      readyAt.current = performance.now();
      setPhase("ready");
    }, delay);
  }

  function handleClick() {
    if (phase === "building") {
      window.clearTimeout(timeoutId.current);
      setPhase("early");
      return;
    }
    if (phase === "ready") {
      const ms = Math.round(performance.now() - readyAt.current);
      setElapsed(ms);
      setPhase("shipped");
      if (best === null || ms < best) {
        setBest(ms);
        window.localStorage.setItem(BEST_KEY, String(ms));
      }
      return;
    }
    start();
  }

  const label =
    phase === "idle"
      ? "Start build"
      : phase === "building"
        ? "Building…"
        : phase === "ready"
          ? "Ship it"
          : "Try again";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-2.5">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span
            className={`h-2 w-2 rounded-full ${
              phase === "ready" ? "bg-primary" : phase === "building" ? "bg-secondary" : "bg-border"
            }`}
          />
          Ship It
        </span>
        {best !== null && (
          <span className="font-mono text-[11px] text-muted-foreground">best {best}ms</span>
        )}
      </div>

      <div className="p-5 text-center">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {phase === "idle" && "Hit start, then ship the instant the build is ready."}
          {phase === "building" && "Building… don't ship yet."}
          {phase === "ready" && "Now. Ship it."}
          {phase === "shipped" && verdict(elapsed ?? 0)}
          {phase === "early" &&
            "Shipped before the build finished. That's an outage, not a deploy."}
        </p>

        {phase === "shipped" && elapsed !== null && (
          <p className="mt-2 font-display text-4xl font-bold text-primary">{elapsed}ms</p>
        )}

        <button
          type="button"
          onClick={handleClick}
          className={`mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition-all active:scale-[0.98] ${
            phase === "ready"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : phase === "building"
                ? "bg-muted text-muted-foreground"
                : "border border-border bg-background text-foreground hover:bg-muted"
          }`}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
