import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Packages</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">@thexjs/cli</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The <span className="text-foreground">x</span> command-line tool: dev server, production
        build, and production start, built on Bun.
      </p>

      <CodeBlock label="terminal" lang="bash" code="bun add @thexjs/cli" />
      <p className="mt-4 text-sm text-muted-foreground">
        Requires Bun on your PATH. The CLI shells out to{" "}
        <span className="text-foreground">bun</span> and uses Bun-only APIs (
        <span className="text-foreground">Bun.serve</span>,{" "}
        <span className="text-foreground">Bun.argv</span>).
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Commands</h2>
      <CodeBlock
        label="commands"
        code={`x dev              # start the dev server with hot reload
x build            # build for production -> .x/
x start            # run the production server (run x build first)

x run dev          # "run" is optional, alias for npm/bun muscle memory

Options:
--cwd <dir>        # run as if started inside <dir>
--adapter <name>   # build target, e.g. "vercel" (default: Bun server -> .x/)
--outDir <dir>     # output directory for build/start (default: .x)

-h, --help         # show help
-v, --version      # print installed @thexjs/cli version`}
      />
      <p className="mt-4 text-muted-foreground">
        <span className="text-foreground">x build --adapter vercel</span> emits a{" "}
        <span className="text-foreground">.vercel/output</span> tree (Build Output API v3) instead
        of <span className="text-foreground">.x/</span>, and{" "}
        <span className="text-foreground">--outDir</span> relocates the build (used by the repo's{" "}
        <span className="text-foreground">Dockerfile</span>, which builds to{" "}
        <span className="text-foreground">dist</span>).
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">package.json scripts</h2>
      <CodeBlock
        label="package.json"
        code={`{
  "scripts": {
    "dev": "x dev",
    "build": "x build",
    "start": "x start"
  }
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Configuration</h2>
      <p className="mt-3 text-muted-foreground">
        The CLI reads <span className="text-foreground">x.config.ts</span> (or{" "}
        <span className="text-foreground">.js</span> / <span className="text-foreground">.mjs</span>
        ) and passes its <span className="text-foreground">defineConfig(...)</span> export to{" "}
        <span className="text-foreground">@thexjs/core</span>:
      </p>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "./src/pages",
  contentDir: "./src/content",
  port: 3000,
});`}
      />
      <p className="mt-4 text-muted-foreground">
        Without a config file, defaults apply: <span className="text-foreground">src/pages</span>{" "}
        for pages, <span className="text-foreground">content</span> for content collections if a{" "}
        <span className="text-foreground">content/</span> directory is present, and{" "}
        <span className="text-foreground">src/actions</span> is auto-detected for server functions.
        Port defaults to <span className="text-foreground">3000</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">What each command does</h2>

      <h3 className="mt-8 text-lg font-semibold">x dev</h3>
      <p className="mt-2 text-muted-foreground">
        Auto-compiles <span className="text-foreground">src/styles/globals.css</span> via{" "}
        <span className="text-foreground">bunx tailwindcss</span> when that file exists, watches{" "}
        <span className="text-foreground">src/styles</span>, then starts{" "}
        <span className="text-foreground">createApp()</span> under{" "}
        <span className="text-foreground">Bun.serve</span>. If the port is taken, tries up to 20
        ports upward.
      </p>

      <h3 className="mt-8 text-lg font-semibold">x build</h3>
      <p className="mt-2 text-muted-foreground">
        Compiles Tailwind in production mode, then writes:
      </p>
      <ul className="mt-3 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">.x/client/</span> holds prerendered HTML for static
          pages, plus <span className="text-foreground">public/</span> assets. Deployable to any
          static host.
        </li>
        <li>
          <span className="text-foreground">.x/server/index.ts</span> is the server entry for SSR
          pages and API routes. Requires a Bun-capable host.
        </li>
      </ul>

      <h3 className="mt-8 text-lg font-semibold">x start</h3>
      <p className="mt-2 text-muted-foreground">
        Runs <span className="text-foreground">.x/server/index.ts</span> with{" "}
        <span className="text-foreground">NODE_ENV=production</span> (or{" "}
        <span className="text-foreground">--outDir dist</span>). If the build has no server entry
        (all static), it serves <span className="text-foreground">.x/client/</span> as a plain
        static server with an SPA <span className="text-foreground">index.html</span> fallback.
        Exits with an error if the build output is missing.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Deployment</h2>
      <p className="mt-3 text-muted-foreground">
        If every page uses <span className="text-foreground">mode = "static"</span> and you have no
        API routes, deploy <span className="text-foreground">.x/client/</span> to any static host.
        Server-mode pages need a host that keeps a Bun process running (Fly.io, Railway, Docker,
        VPS) and runs <span className="text-foreground">x start</span>.
      </p>

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/packages/env"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          @thexjs/env <ArrowRight className="h-3.5 w-3.5" />
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
