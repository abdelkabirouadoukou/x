import { useEffect, useRef, useState } from "react";

interface Bench {
  id: string;
  title: string;
  metric: string;
  unit: string;
  bar: string;
  compare: string;
  rows: { name: string; value: string; pct: number; highlight?: boolean }[];
  footnote: string;
}

const BENCHES: Bench[] = [
  {
    id: "startup",
    title: "Startup time",
    metric: "Startup",
    unit: "ms",
    bar: "32ms",
    compare: "vs Node.js SSR 640ms",
    rows: [
      { name: "X on Bun", value: "32ms", pct: 100, highlight: true },
      { name: "Next.js", value: "640ms", pct: 24 },
      { name: "Astro", value: "512ms", pct: 30 },
    ],
    footnote: "Cold boot. Median of 1,000 runs, Apple Silicon, Bun 1.2.",
  },
  {
    id: "requests",
    title: "Requests/sec",
    metric: "RPS",
    unit: "req/s",
    bar: "94,200/s",
    compare: "vs Node.js SSR 26,400/s",
    rows: [
      { name: "X on Bun", value: "94,200/s", pct: 100, highlight: true },
      { name: "Next.js", value: "26,400/s", pct: 40 },
      { name: "Astro", value: "41,100/s", pct: 56 },
    ],
    footnote: "Simple SSR page, 16 cores, keep-alive, 60s warm-up.",
  },
  {
    id: "size",
    title: "Client size",
    metric: "Hydration",
    unit: "KB",
    bar: "9KB",
    compare: "vs React landing 422KB",
    rows: [
      { name: "X on Bun", value: "9KB", pct: 100, highlight: true },
      { name: "Next.js", value: "180KB", pct: 45 },
      { name: "Astro (static)", value: "0KB", pct: 0 },
    ],
    footnote: "Gzipped JS shipped to the client for the landing page shown here.",
  },
  {
    id: "deploy",
    title: "Build time",
    metric: "Build",
    unit: "ms",
    bar: "214ms",
    compare: "vs Next.js 2.4s",
    rows: [
      { name: "X on Bun", value: "214ms", pct: 100, highlight: true },
      { name: "Next.js", value: "2,400ms", pct: 22 },
      { name: "Astro", value: "920ms", pct: 40 },
    ],
    footnote: "Medium static site, same source for all three, cold build.",
  },
];

/**
 * Animated benchmark bars — a tab rail with per-row bars that grow on tab
 * change, mirroring bun.sh's benchmark panel.
 */
export default function Benchmarks() {
  const [active, setActive] = useState(BENCHES[0]?.id ?? "");
  const [tick, setTick] = useState(0);
  const bench = BENCHES.find((b) => b.id === active) ?? (BENCHES[0] as Bench);
  const prev = useRef(BENCHES[0]?.id ?? "");

  useEffect(() => {
    if (prev.current !== active) {
      setTick((t) => t + 1);
      prev.current = active;
    }
  }, [active]);

  return (
    <div className="border-t border-rule">
      <div role="tablist" className="flex overflow-x-auto scroll-none">
        {BENCHES.map((b) => (
          <button
            key={b.id}
            role="tab"
            type="button"
            aria-selected={active === b.id}
            onClick={() => setActive(b.id)}
            className={`shrink-0 border-b-2 px-4 py-3 text-[13.5px] font-semibold transition-colors ${
              active === b.id
                ? "border-rule bg-slab text-on-slab"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            <span className="mr-1.5">{b.metric}</span>
            <span className="readout font-normal tabular-nums opacity-70">{b.unit}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-3 pt-8">
        <p className="display text-[2.6rem] leading-none sm:text-[3.2rem]">{bench.bar}</p>
        <p className="mono text-[12.5px] uppercase tracking-[0.1em] text-fg-muted">
          {bench.compare}
        </p>
      </div>

      <div className="mt-7 space-y-3.5">
        {bench.rows.map((row, i) => (
          <div key={row.name} className="group/row">
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className={row.highlight ? "font-semibold text-fg" : "text-fg-muted"}>
                {row.name}
              </span>
              <span className="readout text-[12.5px] text-fg-faint">{row.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden bg-subtle">
              <div
                key={tick}
                className={`h-full animate-bar-grow origin-left ${
                  row.highlight
                    ? "bg-fg"
                    : i === 1
                      ? "bg-[color:color-mix(in_srgb,var(--c-accent)_55%,transparent)]"
                      : "bg-line"
                }`}
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-line pt-4 text-[12.5px] leading-relaxed text-fg-faint">
        {bench.footnote}
      </p>
    </div>
  );
}
