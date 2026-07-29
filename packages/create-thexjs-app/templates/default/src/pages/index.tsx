import type { RouteProps } from "@thexjs/core";

export const mode = "static";

export default function HomePage(_props: RouteProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-8 sm:px-10">
      <div className="mb-10 flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-surface/80 px-4 py-3 font-mono text-xs backdrop-blur-sm sm:text-sm">
        <span className="shrink-0 text-muted-foreground">src/pages/</span>
        <span className="text-primary">index.tsx</span>
        <span className="route-line mx-1 h-px flex-1 animate-route-pulse bg-gradient-to-r from-transparent via-primary to-transparent" />
        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">
          /
        </span>
      </div>

      <div className="max-w-2xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/90">
          Your app is running
        </p>
        <h1 className="font-display mt-5 text-[clamp(2.5rem,8vw,4.5rem)] font-extrabold leading-[0.95] tracking-tight">
          Start
          <span className="text-primary"> here.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
          This is your home page — the only route in the default template. Edit{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
            src/pages/index.tsx
          </code>{" "}
          and save. The dev server reloads instantly.
        </p>
      </div>

      <div className="mt-14 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-24px_rgba(240,160,48,0.15)]">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">terminal</span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-muted-foreground">
          <span className="text-foreground">$</span> bun run dev{"\n"}
          <span className="text-primary/80">→</span> dev server at{" "}
          <span className="text-foreground">http://localhost:3000</span>
        </pre>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a
          href="https://thexjs.vercel.app/docs"
          className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Read the docs
        </a>
        <a
          href="https://github.com/abdelkabirouadoukou/x"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
