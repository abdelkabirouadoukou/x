"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Falling {
  id: number;
  name: string;
  safe: boolean;
  left: number;
  duration: number;
}

const SAFE = [
  "THEXJS_PUBLIC_API_URL",
  "THEXJS_PUBLIC_SITE_NAME",
  "THEXJS_PUBLIC_ANALYTICS_ID",
  "THEXJS_PUBLIC_CDN_URL",
  "THEXJS_PUBLIC_FEATURE_FLAG",
];
const SECRET = [
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "SESSION_SECRET",
  "JWT_SIGNING_KEY",
  "SMTP_PASSWORD",
  "AWS_SECRET_ACCESS_KEY",
];

const ROUND_MS = 30_000;

export default function LeakCheck() {
  const [items, setItems] = useState<Falling[]>([]);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [running, setRunning] = useState(false);
  const idRef = useRef(0);
  const bestRef = useRef(0);
  const [best, setBest] = useState(0);

  const spawn = useCallback(() => {
    const isSafe = Math.random() < 0.55;
    const pool = isSafe ? SAFE : SECRET;
    const name = pool[Math.floor(Math.random() * pool.length)] ?? pool[0] ?? "UNKNOWN";
    idRef.current += 1;
    setItems((prev) => [
      ...prev,
      {
        id: idRef.current,
        name,
        safe: isSafe,
        left: 6 + Math.random() * 78,
        duration: 3800 + Math.random() * 1400,
      },
    ]);
  }, []);

  useEffect(() => {
    if (!running) return;
    const spawnTimer = window.setInterval(spawn, 750);
    const clock = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 100) {
          window.clearInterval(spawnTimer);
          window.clearInterval(clock);
          setRunning(false);
          return 0;
        }
        return t - 100;
      });
    }, 100);
    return () => {
      window.clearInterval(spawnTimer);
      window.clearInterval(clock);
    };
  }, [running, spawn]);

  function start() {
    setItems([]);
    setScore(0);
    setMisses(0);
    setTimeLeft(ROUND_MS);
    setRunning(true);
  }

  function catchItem(item: Falling) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (item.safe) {
      setScore((s) => {
        const next = s + 1;
        if (next > bestRef.current) {
          bestRef.current = next;
          setBest(next);
        }
        return next;
      });
    } else {
      setMisses((m) => m + 1);
      setScore((s) => Math.max(0, s - 2));
    }
  }

  function landed(item: Falling) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (item.safe) setMisses((m) => m + 1);
  }

  const done = !running && timeLeft === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-2.5">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-secondary" /> Leak Check
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          score {score} · misses {misses} · best {best}
        </span>
      </div>
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-secondary transition-[width] duration-100 linear"
          style={{ width: `${(timeLeft / ROUND_MS) * 100}%` }}
        />
      </div>

      <div className="relative h-72 overflow-hidden bg-background">
        {!running && !done && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-muted-foreground">
              Click only the <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">THEXJS_PUBLIC_</code>{" "}
              vars before they land. Everything else is a secret — let it fall.
            </p>
            <button
              type="button"
              onClick={start}
              className="stamp-press inline-flex h-9 items-center rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90"
            >
              Start 30s run
            </button>
          </div>
        )}

        {done && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Time's up</p>
            <p className="font-display text-3xl font-bold text-foreground">{score} pts</p>
            <p className="text-sm text-muted-foreground">
              {misses === 0 ? "Not one secret leaked. That's the whole point." : `${misses} secret(s) reached the client.`}
            </p>
            <button
              type="button"
              onClick={start}
              className="stamp-press mt-2 inline-flex h-9 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Run it again
            </button>
          </div>
        )}

        {running &&
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => catchItem(item)}
              onAnimationEnd={() => landed(item)}
              style={{
                left: `${item.left}%`,
                animationDuration: `${item.duration}ms`,
              }}
              className={`leak-item absolute top-0 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[11px] font-medium shadow-sm ${
                item.safe
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-secondary/40 bg-secondary/10 text-secondary"
              }`}
            >
              {item.name}
            </button>
          ))}
      </div>
    </div>
  );
}
