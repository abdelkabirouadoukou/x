import type { ReactNode } from "react";

interface GridItem {
  title: string;
  copy: string;
  href: string;
  icon: ReactNode;
  stamp?: string;
  cmd?: string;
}

const ITEMS: GridItem[] = [
  {
    title: "File-based routing",
    copy: "Pages, loaders, API routes and server functions live in the file tree.",
    href: "/docs/routing",
    stamp: "01",
    cmd: "src/pages/index.tsx",
    icon: <span className="readout text-[15px] font-bold">→/</span>,
  },
  {
    title: "Islands hydration",
    copy: "Pages ship as static HTML. Mark what hydrates and users download JavaScript only for those parts.",
    href: "/docs/islands",
    stamp: "02",
    cmd: "export const islands",
    icon: <span className="readout text-[15px] font-bold">▣</span>,
  },
  {
    title: "Server functions",
    copy: "Import server code into client components. Typed, CSRF-safe, no endpoint glue.",
    href: "/docs/server-functions",
    stamp: "03",
    cmd: "$x server-functions",
    icon: <span className="readout text-[15px] font-bold">fn</span>,
  },
  {
    title: "Data & migrations",
    copy: "SQLite and PostgreSQL with versioned migrations, straight from loaders.",
    href: "/docs/data-layer",
    stamp: "04",
    cmd: "defineDb()",
    icon: <span className="readout text-[15px] font-bold">DB</span>,
  },
];

function Starburst({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="font-display pointer-events-none absolute -right-6 -top-6 select-none text-[88px] font-black leading-none text-fg/[0.07]"
      style={{ animation: "spin-starburst 96s linear infinite" }}
    >
      {label}
    </span>
  );
}

function GridCard({ item }: { item: GridItem }) {
  return (
    <a
      href={item.href}
      className="group relative flex min-h-[16rem] flex-col justify-between overflow-hidden bg-subtle p-6 transition-colors duration-300 hover:bg-canvas"
    >
      <Starburst label={item.stamp ?? "x"} />
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-canvas text-fg">
        {item.icon}
      </div>
      <div className="relative">
        <h3 className="text-[1.1rem] font-bold tracking-[-0.01em] text-fg">{item.title}</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted">{item.copy}</p>
        {item.cmd && (
          <p className="readout mt-3 border-t border-line pt-2.5 font-mono text-[11.5px] text-fg-faint">
            <span className="text-accent">$</span> {item.cmd}
          </p>
        )}
      </div>
      <span className="absolute right-4 top-4 text-fg-faint transition-transform duration-300 group-hover:translate-x-1">
        →
      </span>
    </a>
  );
}

/**
 * Four-tool grid — full-bleed card grid with spinning starburst stamps and
 * `$ x` command footers, mirroring bun.sh's four-tool section.
 */
export default function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map((item) => (
        <GridCard key={item.title} item={item} />
      ))}
    </div>
  );
}
