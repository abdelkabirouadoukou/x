import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage({}: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Build &amp; Deploy
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Build &amp; deploy</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        x produces optimized production builds with static HTML export, a server entry point, and
        content collection rendering — all in a single command.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Build command</h2>
      <p className="mt-3 text-muted-foreground">
        Run <span className="text-foreground">x build</span> to produce a production build. The
        build output goes to a <span className="text-foreground">.x/</span> directory.
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`x build
  [x] resolving routes...
  [x] found 12 routes
  [x] building static pages...
  [x] building server bundle...
  [x] rendering content collections...
  [x] build complete in 1.2s`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Output structure</h2>
      <p className="mt-3 text-muted-foreground">
        The <span className="text-foreground">.x/</span> directory contains everything needed to
        deploy — static files, server bundle, and assets.
      </p>
      <CodeBlock
        label="output tree"
        lang="tree"
        code={`.x/
  client/         // Client-side assets
    assets/
      *.js               // Bundled JS
      *.css              // Extracted CSS
  server/         // Server entry point
    index.js             // Bun server bundle
  static/        // Prerendered HTML pages
    index.html
    about/index.html
    blog/
      hello-world/index.html
  x.json             // Build manifest`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Static page export</h2>
      <p className="mt-3 text-muted-foreground">
        Pages with <span className="text-foreground">mode = "static"</span> are exported as HTML
        files in <span className="text-foreground">.x/static/</span>. Each page is fully rendered at
        build time, including its loader output. For dynamic-static pages (static pages with dynamic
        params), x generates one HTML file per unique path.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Server entry</h2>
      <p className="mt-3 text-muted-foreground">
        Server-rendered pages are bundled into{" "}
        <span className="text-foreground">.x/server/index.js</span>. This file contains all server
        routes, API handlers, server functions, and middleware — everything needed to run the
        dynamic parts of your app.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Production server</h2>
      <p className="mt-3 text-muted-foreground">
        Use <span className="text-foreground">x start</span> to run the production server. It serves
        static files from <span className="text-foreground">.x/static/</span> and handles dynamic
        routes via the server bundle.
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`x start
  [x] production server running at http://localhost:3000`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Docker deployment</h2>
      <p className="mt-3 text-muted-foreground">
        Deploy with a minimal Docker image using the official Bun runtime. The build output is
        self-contained.
      </p>
      <CodeBlock
        label="Dockerfile"
        code={`FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock .
RUN bun install
COPY . .
RUN x build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app/.x .x
EXPOSE 3000
CMD ["x", "start"]`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Content collections in builds</h2>
      <p className="mt-3 text-muted-foreground">
        During <span className="text-foreground">x build</span>, content collections are scanned and
        rendered. Each markdown file becomes a static HTML page if its route uses static mode, or is
        available for server-rendered routes to consume.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Deploy to Vercel</h2>
      <p className="mt-3 text-muted-foreground">
        Vercel doesn't run a long-lived Bun process, so it uses a different adapter:{" "}
        <span className="text-foreground">@thexjs/adapter-vercel</span> builds a{" "}
        <span className="text-foreground">.vercel/output/</span> tree (Build Output API v3)
        directly — no <span className="text-foreground">vercel.json</span> required.
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`bun add -d @thexjs/adapter-vercel
x build --adapter vercel
vercel deploy --prebuilt`}
      />
      <p className="mt-3 text-muted-foreground">
        If every page in your app uses <span className="text-foreground">mode = "static"</span>{" "}
        (no API routes, no server actions), no function is emitted at all — just static files and
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
