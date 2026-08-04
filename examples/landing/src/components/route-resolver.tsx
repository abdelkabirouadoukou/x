"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveRoute } from "../actions/resolve";

type Resolved =
  | { kind: "page"; route: string; note?: string }
  | { kind: "api"; route: string }
  | { kind: "skip"; note: string }
  | { kind: "notfound" };

type ServerCheck =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; route: string | null; ms: number }
  | { status: "error" };

const EXAMPLES = [
  "pages/index.tsx",
  "pages/about.tsx",
  "pages/blog/[slug].tsx",
  "pages/docs/[...path].tsx",
  "api/users.ts",
  "pages/_404.tsx",
];

function resolvePath(raw: string): Resolved {
  let p = raw
    .trim()
    .replace(/^src\//, "")
    .replace(/^\.?\//, "");

  if (p === "") return { kind: "skip", note: "start typing a path…" };

  const isApi = p.startsWith("api/");
  p = p.replace(/^pages\//, "").replace(/^api\//, "");
  p = p.replace(/\.(tsx|ts|jsx|js)$/, "");

  const base = p.split("/").pop() ?? "";

  if (base.startsWith("_layout")) {
    return { kind: "skip", note: "layouts wrap routes, they aren't routes themselves" };
  }
  if (base.startsWith("_middleware")) {
    return { kind: "skip", note: "middleware runs before a route, it isn't a route itself" };
  }
  if (base === "_404") {
    return { kind: "notfound" };
  }

  let route = `/${p}`;
  route = route.replace(/\/index$/, "") || "/";
  route = route.replace(/\[\.\.\.(\w+)\]/g, ":$1*");
  route = route.replace(/\[(\w+)\]/g, ":$1");

  if (!route.startsWith("/")) route = `/${route}`;

  return isApi ? { kind: "api", route } : { kind: "page", route };
}

export default function RouteResolver() {
  const [value, setValue] = useState("pages/blog/[slug].tsx");
  const resolved = useMemo(() => resolvePath(value), [value]);
  const [server, setServer] = useState<ServerCheck>({ status: "idle" });

  useEffect(() => {
    setServer({ status: "idle" });
  }, []);

  async function confirmWithServer() {
    setServer({ status: "loading" });
    const startedAt = performance.now();
    try {
      const result = await resolveRoute(value);
      const ms = Math.round(performance.now() - startedAt);
      setServer({ status: "done", route: result.route, ms });
    } catch {
      setServer({ status: "error" });
    }
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Route Resolver
        </span>
      </div>

      <div className="p-5">
        <label htmlFor="route-resolver-input" className="font-mono text-xs text-muted-foreground">
          src/
        </label>
        <input
          id="route-resolver-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          className="mt-1.5 block w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="pages/blog/[slug].tsx"
        />

        <div className="mt-4 flex items-center gap-3">
          <svg
            width="28"
            height="24"
            viewBox="0 0 28 24"
            className="shrink-0 text-border"
            aria-hidden="true"
          >
            <path
              d="M2 12H24M24 12L18 6M24 12L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="route-line-dash"
            />
          </svg>

          <div className="min-h-9 flex-1">
            {resolved.kind === "page" && (
              <span
                key={resolved.route}
                className="animate-pin-drop inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-mono text-sm font-medium text-accent-foreground"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {resolved.route}
              </span>
            )}
            {resolved.kind === "api" && (
              <span
                key={resolved.route}
                className="animate-pin-drop inline-flex items-center gap-1.5 rounded-lg bg-secondary/10 px-3 py-1.5 font-mono text-sm font-medium text-secondary"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                {resolved.route}
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  api
                </span>
              </span>
            )}
            {resolved.kind === "notfound" && (
              <span className="animate-pin-drop inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 font-mono text-sm font-medium text-muted-foreground">
                catches every unmatched route
              </span>
            )}
            {resolved.kind === "skip" && (
              <span className="inline-flex items-center px-1 py-1.5 font-mono text-sm text-muted-foreground">
                {resolved.note}
              </span>
            )}
          </div>
        </div>

        {resolved.kind !== "skip" && (
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={confirmWithServer}
              disabled={server.status === "loading"}
              className="inline-flex h-8 shrink-0 items-center rounded-full border border-chrome-lo bg-background/70 px-4 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-60"
            >
              {server.status === "loading" ? "Asking the server…" : "Confirm with server →"}
            </button>

            <div className="min-w-0 flex-1 font-mono text-[11px] text-muted-foreground">
              {server.status === "done" && server.route && (
                <span className="text-primary">
                  server says {server.route} · {server.ms}ms round trip
                </span>
              )}
              {server.status === "done" && !server.route && (
                <span>server agrees, this is not a route</span>
              )}
              {server.status === "error" && (
                <span className="text-secondary">
                  dev server not reachable. Run `bun run dev` to try this live
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setValue(ex)}
              className="rounded-full border border-chrome-lo bg-background/70 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
