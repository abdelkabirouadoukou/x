import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Incremental Static Regeneration
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">ISR</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Static pages that stay fresh: prerender once, serve from cache, and revalidate on a timer.
        ISR gives you the speed of a static export with data that eventually updates.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Prerender with revalidation</h2>
      <p className="mt-3 text-muted-foreground">
        A page that exports <span className="text-foreground">mode = "static"</span> plus{" "}
        <span className="text-foreground">revalidate</span> is prerendered at build time and then
        re-rendered on demand once the cache expires.
      </p>
      <CodeBlock
        label="src/pages/stats.tsx"
        code={`import type { RouteProps, LoaderArgs } from "@thexjs/core";

export const mode = "static";
export const revalidate = 3600; // seconds

export async function loader({}: LoaderArgs) {
  const stats = await fetchStats();
  return { stats };
}

export default function Stats({ loaderData }: RouteProps) {
  const { stats } = loaderData as { stats: unknown };
  return (
    <div>
      <h1 className="text-3xl font-bold">Stats</h1>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </div>
  );
}`}
      />
      <p className="mt-4 text-muted-foreground">
        <span className="text-foreground">revalidate</span> accepts dynamic pages too. A page with{" "}
        <span className="text-foreground">mode = "server"</span> and{" "}
        <span className="text-foreground">revalidate</span> behaves like the classic ISR model: the
        first request after a cache miss renders fresh, subsequent requests within the window are
        served from cache.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Cache headers</h2>
      <p className="mt-3 text-muted-foreground">
        Responses from a revalidated page carry an{" "}
        <span className="text-foreground">X-Revalidated</span> header so you can tell how the page
        was served:
      </p>
      <CodeBlock
        label="X-Revalidated values"
        code={`X-Revalidated: hit    # served from the static cache
X-Revalidated: miss   # rendered fresh, cache was stale or empty
X-Revalidated: none   # page has no revalidate window`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Invalidating on demand</h2>
      <p className="mt-3 text-muted-foreground">
        You don't have to wait for the timer. A{" "}
        <span className="text-foreground">POST /__x/revalidate</span> request with a JSON body{" "}
        <span className="text-foreground">{'{ "path": "/stats" }'}</span> clears that page's cache
        entry, so the next request renders fresh. An empty body clears the entire cache.
      </p>
      <CodeBlock
        label="revalidate one page"
        code={`await fetch("http://localhost:3000/__x/revalidate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/stats" }),
});`}
      />
      <p className="mt-4 text-muted-foreground">
        This is the hook for a CMS webhook or an admin action: a content edit can push a fresh
        render immediately instead of waiting for the revalidate window.
      </p>

      <div className="mt-16 border-t border-border pt-8">
        <a
          href="/docs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to docs
        </a>
      </div>
    </div>
  );
}
