interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: "7×", label: "faster cold start than Node.js SSR" },
  { value: "92", label: "request count vs. server bundles in one process" },
  { value: "HTTP/3", label: "behind the built-in production server" },
  { value: "−4MB", label: "node_modules vs. a Next.js portable build" },
];

export default function Stats() {
  return (
    <div className="mx-auto w-full max-w-container px-gutter">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="border-t border-line py-4 sm:py-6">
            <p className="display text-[2.8rem] leading-none tracking-[-0.03em] text-fg">
              {s.value}
            </p>
            <p className="mt-2 max-w-[22ch] text-[13.5px] leading-snug text-fg-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
