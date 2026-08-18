import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Packages</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">@thexjs/core</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        The rendering and routing engine behind x: file-based routing, SSR/SSG, islands, server
        functions, content collections, and a lightweight data layer.
      </p>

      <CodeBlock label="terminal" lang="bash" code="bun add @thexjs/core" />
      <p className="mt-4 text-sm text-muted-foreground">
        Requires Bun. You typically do not install this directly.{" "}
        <a href="/docs/packages/cli" className="text-primary underline underline-offset-2">
          @thexjs/cli
        </a>{" "}
        depends on it and drives <span className="text-foreground">x dev</span> /{" "}
        <span className="text-foreground">x build</span> /{" "}
        <span className="text-foreground">x start</span>.
      </p>

      <h2 className="text-xl">Quick start</h2>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "./src/pages",
  contentDir: "./src/content",
  port: 3000,
});`}
      />
      <CodeBlock
        label="src/pages/index.tsx"
        code={`import type { RouteProps } from "@thexjs/core";

export const mode = "static";

export default function HomePage({}: RouteProps) {
  return <h1>Hello from x</h1>;
}`}
      />

      <h2 className="text-xl">File-based routing</h2>
      <CodeBlock
        label="route mapping"
        code={`File                          Route
────────────────────────────────────────────
src/pages/index.tsx           /
src/pages/about.tsx           /about
src/pages/blog/[slug].tsx     /blog/:slug
src/pages/blog/[...rest].tsx  /blog/*       (catch-all)
src/api/users.ts              /api/users
src/pages/_layout.tsx         Wraps routes in directory
src/pages/_middleware.ts      Runs before matching routes
src/pages/_404.tsx              Custom not-found page`}
      />
      <p className="mt-4 text-muted-foreground">
        Files and directories prefixed with <span className="text-foreground">_</span> or{" "}
        <span className="text-foreground">.</span> are never treated as routes.
      </p>

      <h2 className="text-xl">Route modes</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Every page defaults to server-rendered. Opt into build-time prerendering:
      </p>
      <CodeBlock
        label="src/pages/index.tsx"
        code={`export const mode: "static" | "server" = "static";`}
      />
      <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">static</span> renders once at build time to HTML in{" "}
          <span className="text-foreground">.x/client/</span>
        </li>
        <li>
          <span className="text-foreground">server</span> renders per request via{" "}
          <span className="text-foreground">x start</span> or{" "}
          <span className="text-foreground">x dev</span>
        </li>
      </ul>

      <h2 className="text-xl">Loaders</h2>
      <CodeBlock
        label="loader example"
        code={`import type { RouteProps } from "@thexjs/core";

export async function loader({ params }: { params: Record<string, string> }) {
  return { user: await getUser(params.id) };
}

export default function UserPage({ loaderData }: RouteProps) {
  const { user } = loaderData as { user: { name: string } };
  return <p>{user.name}</p>;
}`}
      />

      <h2 className="text-xl">Islands</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Wrap interactive pieces in <span className="text-foreground">&lt;Island&gt;</span> and
        register the component on the page or layout with{" "}
        <span className="text-foreground">export const islands</span>. Only registered islands get a
        hydration bundle, so unregistered components never ship client JS. Full details on{" "}
        <a href="/docs/islands" className="text-primary underline underline-offset-2">
          the Islands page
        </a>
        .
      </p>
      <CodeBlock
        label="page with an island"
        code={`import { Island } from "@thexjs/core";
import { LikeButton } from "./like-button";

export const islands = { LikeButton };

export default function Page() {
  return (
    <Island name="LikeButton" client="visible">
      <LikeButton />
    </Island>
  );
}`}
      />
      <p className="mt-4 text-muted-foreground">
        <span className="text-foreground">client</span> accepts{" "}
        <span className="text-foreground">"idle"</span>,{" "}
        <span className="text-foreground">"visible"</span>, or{" "}
        <span className="text-foreground">"load"</span>.
      </p>

      <h2 className="text-xl">Typed routes</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        In dev, <span className="text-foreground">createApp</span> writes{" "}
        <span className="text-foreground">src/x-routes.ts</span> with a{" "}
        <span className="text-foreground">RouteMap</span> type and a typed{" "}
        <span className="text-foreground">href()</span> helper — routes can't drift from your file
        tree, and dynamic segments are checked at compile time. Do not edit the file by hand.
      </p>
      <CodeBlock
        label="typed href"
        code={`import { href } from "../x-routes";

const url = href("/blog/[slug]", { slug: "hello-world" }); // "/blog/hello-world"`}
      />

      <h2 className="text-xl">Incremental static regeneration</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Static pages can revalidate on a timer with{" "}
        <span className="text-foreground">export const revalidate = N</span>, and you can bust the
        cache via <span className="text-foreground">POST /__x/revalidate</span>. See{" "}
        <a href="/docs/isr" className="text-primary underline underline-offset-2">
          the ISR page
        </a>
        .
      </p>

      <h2 className="text-xl">Client navigation &amp; images</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Plain <span className="text-foreground">&lt;a&gt;</span> tags already get SPA-style
        navigation and hover prefetch on every page, with no router setup needed.{" "}
        <span className="text-foreground">&lt;Link&gt;</span> is a typed convenience wrapper over
        the same behavior, and <span className="text-foreground">createImageProxyHandler</span>{" "}
        streams allow-listed remote images through your own origin so a strict{" "}
        <span className="text-foreground">img-src 'self'</span> CSP still works. Full details on{" "}
        <a href="/docs/client-navigation" className="text-primary underline underline-offset-2">
          the Client Navigation &amp; Images page
        </a>
        .
      </p>
      <CodeBlock
        label="link + image proxy"
        code={`import { Link, createImageProxyHandler } from "@thexjs/core";

<Link href="/docs" prefetch>Docs</Link>

const imageProxy = createImageProxyHandler({ remoteHosts: ["cdn.example.com"] });`}
      />

      <h2 className="text-xl">Content collections</h2>
      <CodeBlock
        label="markdown"
        code={`import { scanContent, renderMarkdown } from "@thexjs/core";

const posts = scanContent("./src/content/blog");
const html = renderMarkdown(posts[0].body);`}
      />

      <h2 className="text-xl">Data layer</h2>
      <CodeBlock
        label="sqlite"
        code={`import { connectSQLite, runSQLiteMigrations } from "@thexjs/core/data";

const db = connectSQLite({ path: "./data/dev.db" });
await runSQLiteMigrations(db, "./data/migrations");`}
      />
      <CodeBlock
        label="postgres"
        code={`import { connectPostgres, runPostgresMigrations } from "@thexjs/core/data";

const sql = connectPostgres({ url: process.env.DATABASE_URL! });
await runPostgresMigrations(sql, "./data/migrations");`}
      />

      <h2 className="text-xl">Key exports</h2>
      <CodeBlock
        label="exports"
        code={`defineConfig, createApp, build          App setup & build
renderPage, renderStaticPage            Lower-level rendering
renderStreamingPage                     Streaming SSR for Suspense
scanRoutes, scanPages, scanApiDir       Routing internals
scanLayouts, scanMiddleware, scanNotFound  Layout/middleware/404 scanning
findLayoutChain, findMiddlewareChain    Resolve chains from a route
generateManifestSource, writeManifest   Typed route map (src/x-routes.ts)
Island, IslandProvider                  Selective hydration
Link, CLIENT_NAV_SCRIPT                 Client-side navigation
DefaultNotFound, renderErrorOverlay     404 page & dev error overlay
createImageProxyHandler                 Remote image proxy (/_x/image)
scanContent, renderMarkdown, escapeHtml Markdown content
composeMiddleware, MiddlewareFn         Route middleware
registerServerFunctions, generateServerFunctionClient  Server functions
createRateLimiter, rateLimitMiddleware  Rate limiting
createRedisRateLimitStore               Shared Redis rate-limit store
checkCsrf, verifyOrigin, verifyCsrfToken, generateCsrfToken, withCsrfCookie  CSRF
buildSecurityHeaders, applySecurityHeaders  Security response headers
findLeakedEnvKeys, assertNoEnvLeakage   Build-time env isolation
logger, withRequestLogging              Structured JSON logging
setErrorReporter, reportException, combineReporters  Error reporting
createSentryReporter, createOtelReporter  Sentry / OpenTelemetry adapters
createHealthCheckHandler                /healthz + /readyz probes
connectSQLite, connectPostgres          Data layer (subpath @thexjs/core/data)
runSQLiteMigrations, runPostgresMigrations  File-based migrations`}
      />

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/packages/cli"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          @thexjs/cli <ArrowRight className="h-3.5 w-3.5" />
        </a>
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
