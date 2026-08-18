import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Build &amp; Deploy</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">
        Build &amp; deploy
      </h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        x produces optimized production builds: prerendered HTML, island bundles, and a server entry
        point, all in one command.
      </p>

      <h2 className="text-xl">Build command</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Run <span className="text-foreground">x build</span> to produce a production build. The
        build output goes to a <span className="text-foreground">.x/</span> directory (override with{" "}
        <span className="text-foreground">--outDir</span>).
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`x build
  [x] resolving routes...
  [x] found 12 routes
  [x] building static pages...
  [x] building island bundles...
  [x] building server bundle...
  [x] build complete in 1.2s -> .x

x build --outDir dist   # write to ./dist instead of .x/`}
      />

      <h2 className="text-xl">Output structure</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The <span className="text-foreground">.x/</span> directory contains everything needed to
        deploy:
      </p>
      <CodeBlock
        label="output tree"
        lang="tree"
        code={`.x/
  client/               // Static site: prerendered HTML + public/ assets
    index.html
    about/index.html
    blog/
      hello-world/index.html
    _islands/
      index-abc123/       // One hydration bundle per page's islands
        index-abc123.js
    styles.css           // Compiled Tailwind
    favicon.ico
  server/
    index.ts             // Server entry for SSR/API/actions (run with x start)`}
      />
      <p className="mt-4 text-muted-foreground">
        Static pages (and their <span className="text-foreground">public/</span> assets) live under{" "}
        <span className="text-foreground">.x/client/</span> and deploy to any static host. Server
        code ships as <span className="text-foreground">.x/server/index.ts</span>, a single entry
        that re-imports your <span className="text-foreground">x.config.ts</span> at runtime.
      </p>

      <h2 className="text-xl">Static page export</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Pages with <span className="text-foreground">mode = "static"</span> are rendered at build
        time, including their loader output. Dynamic segments generate one HTML file per unique path
        at build time.
      </p>

      <h2 className="text-xl">Incremental static regeneration</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        A static page can opt into time-based revalidation with{" "}
        <span className="text-foreground">revalidate</span>. The page is prerendered on first
        request, cached in memory for N seconds, then re-rendered on demand. Each response carries
        an <span className="text-foreground">X-Revalidated</span> header ({" "}
        <span className="text-foreground">hit</span> / <span className="text-foreground">miss</span>{" "}
        / <span className="text-foreground">none</span>).
      </p>
      <CodeBlock
        label="src/pages/pricing.tsx"
        code={`export const mode = "static";
export const revalidate = 3600; // re-render at most once per hour`}
      />
      <p className="mt-4 text-muted-foreground">
        Bust the cache programmatically with a <span className="text-foreground">POST</span> to{" "}
        <span className="text-foreground">/__x/revalidate</span> — send{" "}
        <span className="text-foreground">{`{ "path": "/pricing" }`}</span> to revalidate one page
        or an empty body to clear the whole cache.
      </p>

      <h2 className="text-xl">Production server</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Use <span className="text-foreground">x start</span> to run{" "}
        <span className="text-foreground">.x/server/index.ts</span>. It serves static files and
        handles dynamic routes, and the entry handles{" "}
        <span className="text-foreground">SIGTERM</span>/
        <span className="text-foreground">SIGINT</span> gracefully: it stops accepting connections,
        flushes the error reporter, and drains in-flight requests for up to 3 seconds before
        exiting.
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`x start
  [x] production server running at http://localhost:3000

PORT=8080 x start   # PORT env var overrides the default 3000`}
      />
      <p className="mt-4 text-muted-foreground">
        If a build has no server entry (every page is static and there are no API routes),{" "}
        <span className="text-foreground">x start</span> falls back to serving{" "}
        <span className="text-foreground">.x/client/</span> as a plain static file server with an
        SPA <span className="text-foreground">index.html</span> fallback.
      </p>

      <h2 className="text-xl">Programmatic build</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">build()</span> from{" "}
        <span className="text-foreground">@thexjs/core</span> runs the same pipeline the CLI uses,
        useful for custom deploy scripts:
      </p>
      <CodeBlock
        label="build.mjs"
        code={`import { build } from "@thexjs/core";

await build({
  pagesDir: "src/pages",
  apiDir: "src/api",
  actionsDir: "src/actions",
  outDir: "dist",
  configPath: "x.config.ts",
});`}
      />

      <h2 className="text-xl">Docker deployment</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Deploy with a minimal Docker image using the official Bun runtime:
      </p>
      <CodeBlock
        label="Dockerfile"
        code={`FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock .
RUN bun install
COPY . .
RUN bun run build:packages
RUN x build --outDir dist

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app/dist dist
COPY --from=build /app/node_modules node_modules
EXPOSE 3000
CMD ["x", "start", "--outDir", "dist"]`}
      />

      <h2 className="text-xl">Deploy to Vercel</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Vercel doesn't run a long-lived Bun process, so it uses a different adapter:{" "}
        <span className="text-foreground">@thexjs/adapter-vercel</span> builds a{" "}
        <span className="text-foreground">.vercel/output/</span> tree (Build Output API v3)
        directly, so no <span className="text-foreground">vercel.json</span> is required.
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`bun add -d @thexjs/adapter-vercel
x build --adapter vercel
vercel deploy --prebuilt`}
      />
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        If every page in your app uses <span className="text-foreground">mode = "static"</span> (no
        API routes, no server actions), no function is emitted at all, just static files and
        filesystem routing. Server-mode pages, API routes, and server actions run inside a single
        bundled <span className="text-foreground">nodejs20.x</span> function.
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
