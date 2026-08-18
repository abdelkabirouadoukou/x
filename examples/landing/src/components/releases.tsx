const RELEASES = [
  {
    version: "v1.3.1",
    date: "Aug 2026",
    notes: "Islands to disk, server-mode islands, image proxy with w/q.",
  },
  {
    version: "v1.0.8",
    date: "Jul 2026",
    notes: "Vercel adapter — static + server-mode islands in one deploy.",
  },
  {
    version: "v1.0.0",
    date: "Jun 2026",
    notes: "First stable. File-based SSR + SSG + APIs, one process.",
  },
];

export default function Releases() {
  return (
    <div className="space-y-1">
      {RELEASES.map((r) => (
        <a
          key={r.version}
          href="/docs/releases"
          className="flex items-center justify-between gap-4 border-b border-line px-2.5 py-4 transition-colors hover:bg-subtle"
        >
          <div className="min-w-0">
            <p className="mono text-[13.5px] font-medium text-fg">{r.version}</p>
            <p className="mt-0.5 truncate text-[13px] text-fg-muted">{r.notes}</p>
          </div>
          <span className="label shrink-0">{r.date}</span>
        </a>
      ))}
    </div>
  );
}
