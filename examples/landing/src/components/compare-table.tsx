import { Check, ChevronDown, Minus, X } from "lucide-react";
import { useState } from "react";

type Status = 1 | 0 | -1; // yes / partial / no

interface Row {
  feature: string;
  link?: string;
  sub?: string;
  x: Status;
  nextjs: Status;
  astro: Status;
  note?: string;
}

const ROWS: Row[] = [
  { feature: "File-based routing", link: "/docs/routing", x: 1, nextjs: 1, astro: 1 },
  { feature: "Static + server per route", link: "/docs/pages", x: 1, nextjs: 1, astro: 1 },
  { feature: "API routes in the file tree", link: "/docs/api-routes", x: 1, nextjs: 1, astro: 1 },
  { feature: "Server functions", link: "/docs/server-functions", x: 1, nextjs: 1, astro: 0 },
  {
    feature: "Islands hydration",
    link: "/docs/islands",
    x: 1,
    nextjs: 0,
    astro: 1,
    note: "Next.js hydrates whole components via client boundaries; x and Astro hydrate islands in place.",
  },
  { feature: "ISR / revalidate on a timer", link: "/docs/isr", x: 1, nextjs: 1, astro: 0 },
  {
    feature: "Incremental static regeneration, on demand",
    link: "/docs/isr",
    x: 1,
    nextjs: 1,
    astro: 0,
  },
  {
    feature: "Client navigation & prefetch",
    link: "/docs/client-navigation",
    x: 1,
    nextjs: 1,
    astro: 0,
  },
  { feature: "SQLite integration", link: "/docs/data-layer", x: 1, nextjs: 0, astro: 0 },
  { feature: "PostgreSQL integration", link: "/docs/data-layer", x: 1, nextjs: 0, astro: 0 },
  { feature: "Migrations", link: "/docs/data-layer", x: 1, nextjs: 0, astro: 0 },
  {
    feature: "Content collections (markdown)",
    link: "/docs/content-collections",
    x: 1,
    nextjs: 0,
    astro: 1,
  },
  { feature: "Credentials + OAuth2 auth", link: "/docs/packages/auth", x: 1, nextjs: 0, astro: 0 },
  {
    feature: "Sessions & CSRF, out of the box",
    link: "/docs/packages/auth",
    x: 1,
    nextjs: 0,
    astro: 0,
  },
  { feature: "Build-time env isolation", link: "/docs/security", x: 1, nextjs: 0, astro: 0 },
  {
    feature: "Security headers (CSP, HSTS, X-Frame-Options)",
    link: "/docs/security",
    x: 1,
    nextjs: 1,
    astro: 1,
  },
  {
    feature: "In-memory rate limiting, default on",
    link: "/docs/security",
    x: 1,
    nextjs: 0,
    astro: 0,
  },
  { feature: "Remote image proxy", link: "/docs/client-navigation", x: 1, nextjs: 1, astro: 0 },
  {
    feature: "Single process: static + SSR + API",
    link: "/docs/introduction",
    x: 1,
    nextjs: 1,
    astro: 0,
  },
  {
    feature: "Zero-config production build",
    link: "/docs/build-deploy",
    x: 1,
    nextjs: 1,
    astro: 1,
  },
  {
    feature: "Layered — no server for static export",
    link: "/docs/build-deploy",
    x: 1,
    nextjs: 1,
    astro: 0,
  },
  { feature: "Structured JSON logging", link: "/docs/observability", x: 1, nextjs: 0, astro: 0 },
  { feature: "Health + readiness probes", link: "/docs/observability", x: 1, nextjs: 0, astro: 0 },
];

const GROUPS = [
  { label: "Rendering", from: 0, to: 7 },
  { label: "Data", from: 8, to: 11 },
  { label: "Security", from: 12, to: 17 },
  { label: "Runtime", from: 18, to: 19 },
  { label: "Operability", from: 20, to: 22 },
];

const VISIBLE = 14;

function StatusCell({ s, note }: { s: Status; note?: string }) {
  const inner =
    s === 1 ? (
      <span className="status-yes">
        <Check className="h-3.5 w-3.5" />
      </span>
    ) : s === 0 ? (
      <span className="status-partial">
        <Minus className="h-3 w-3" />
      </span>
    ) : (
      <span className="status-no">
        <X className="h-3 w-3" />
      </span>
    );

  if (!note) return inner;
  return (
    <span className="group/tip relative inline-flex">
      {inner}
      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden w-max max-w-[240px] -translate-x-1/2 rounded-md bg-fg px-2.5 py-1.5 text-center text-[12px] leading-snug text-canvas opacity-0 transition-opacity group-hover/tip:opacity-100 md:block">
        {note}
      </span>
    </span>
  );
}

/**
 * Comparison table — x vs Next.js vs Astro, feature rows with a "show all"
 * scrim + stagger reveal. Statuses are drawn from the docs in this repo.
 */
export default function CompareTable() {
  const [open, setOpen] = useState(false);
  const visible = open ? ROWS.length : VISIBLE;

  return (
    <div className="mt-12 overflow-hidden rounded-lg border border-line bg-surface">
      <div
        className="relative overflow-hidden transition-[height] duration-700 ease-out"
        style={{ height: open ? undefined : 600 }}
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-subtle/60 text-[13px]">
              <th className="rounded-tl-lg px-3 py-3 font-medium text-fg-faint sm:px-6">Feature</th>
              <th className="w-12 px-1 py-3 text-center sm:w-28 sm:px-4">
                <span className="inline-flex items-center gap-1.5 font-semibold text-fg">X</span>
              </th>
              <th className="w-12 px-1 py-3 text-center sm:w-28 sm:px-4 text-[12px] font-medium text-fg-muted sm:text-[13px]">
                Next.js
              </th>
              <th className="rounded-tr-lg w-12 px-1 py-3 text-center sm:w-28 sm:px-4 text-[12px] font-medium text-fg-muted sm:text-[13px]">
                Astro
              </th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <FragmentRow key={g.label} group={g} visible={visible} rows={ROWS} />
            ))}
          </tbody>
        </table>

        {!open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-28 items-end justify-center border-t border-rule bg-gradient-to-t from-canvas via-canvas/90 to-transparent pt-6 pb-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13.5px] font-medium text-fg transition-transform hover:-translate-y-px hover:bg-subtle"
            >
              Show all {ROWS.length} rows
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentRow({
  group,
  visible,
  rows,
}: {
  group: { label: string; from: number; to: number };
  visible: number;
  rows: Row[];
}) {
  return (
    <>
      <tr>
        <th
          colSpan={4}
          scope="colgroup"
          className="mono border-b border-line bg-subtle/40 px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-faint sm:px-6"
        >
          {group.label}
        </th>
      </tr>
      {rows.slice(group.from, group.to + 1).map((row, i) => {
        const rowIdx = group.from + i;
        if (rowIdx >= visible) return null;
        return (
          <tr
            key={row.feature}
            className="border-b border-line transition-colors last:border-b-0 hover:bg-canvas animate-row-in"
            style={{ animationDelay: `${Math.max(0, rowIdx - VISIBLE) * 32}ms` }}
          >
            <th scope="row" className="px-3 py-3 text-[14px] font-normal sm:px-6 sm:text-[15px]">
              <span className="font-medium text-fg">{row.feature}</span>
              {row.sub && (
                <div className="mt-0.5 hidden text-[13px] text-fg-muted md:block">{row.sub}</div>
              )}
            </th>
            <td className="px-1 py-3 text-center align-middle sm:px-4">
              <StatusCell s={row.x} />
            </td>
            <td className="px-1 py-3 text-center align-middle sm:px-4">
              <StatusCell s={row.nextjs} />
            </td>
            <td className="px-1 py-3 text-center align-middle sm:px-4">
              {row.note !== undefined ? (
                <StatusCell s={row.astro} note={row.note} />
              ) : (
                <StatusCell s={row.astro} />
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}
