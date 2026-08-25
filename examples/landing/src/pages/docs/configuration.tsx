import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Configuration</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Configuration</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Configure X via <span className="text-foreground">x.config.ts</span> at your project root.
        Use <span className="text-foreground">defineConfig</span> from{" "}
        <span className="text-foreground">@thexjs/core</span> for type-safe configuration.
      </p>

      <h2 className="text-xl">defineConfig</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        All configuration options are optional. X provides sensible defaults so you can start with
        zero configuration and add settings as needed.
      </p>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig } from "@thexjs/core";

export default defineConfig({
  // Page routes
  pagesDir: "src/pages",

  // Layout directory (for root layouts)
  layoutsDir: "src/layouts",

  // API routes
  apiDir: "src/api",

  // Server functions
  actionsDir: "src/actions",

  // Content collections (markdown)
  contentDir: "content",

  // Dev server port
  port: 3000,

  // Security guardrails (headers, CSRF, rate limiting)
  security: {
    csrf: { requireToken: true },
    headers: { contentSecurityPolicy: "default-src 'self'; script-src 'self'" },
    rateLimit: { limit: 120 },
  },

  // Observability (logging, health probes, error reporting)
  observability: {
    logging: true,
    health: { check: () => ({ status: "ok" }) },
    errorReporter: (err, ctx) => console.error(err, ctx),
  },

  // Remote image proxy allow-list
  images: {
    remoteHosts: ["cdn.example.com"],
  },

  // Reject request bodies larger than 1 MB (default: 1 MB)
  maxBodySize: 1024 * 1024,

  // Legacy routes directory
  routesDir: "src/routes",
});`}
      />

      <h2 className="text-xl">All options reference</h2>

      <CodeBlock
        label="options table"
        code={`Option          Type        Default             Description
─────────────────────────────────────────────────────────────
pagesDir        string      "src/pages"        File-based page routes
layoutsDir      string      "src/layouts"      Root layout directory
apiDir          string      "src/api"          File-based API routes
actionsDir      string      "src/actions"      Server functions
contentDir      string      undefined          Markdown content collections
port            number      3000               Dev server port
routesDir       string      undefined          Legacy routes directory
development     boolean     false              Force dev-mode behavior
stylesheetHref  string      undefined          Precomputed stylesheet <link> href
security.csrf   object|false enabled           CSRF for /__x/actions/*
security.headers object|false enabled          CSP, HSTS, X-Frame-Options, ...
security.rateLimit object|false enabled        Per-IP fixed-window limiter
observability.logging boolean true             Structured JSON request logs
observability.errorReporter fn undefined       Plugin for exceptions (Sentry/OTel)
observability.health object undefined         /healthz + /readyz endpoints
images.remoteHosts string[]  undefined        /_x/image proxy allow-list`}
      />

      <h2 className="text-xl">pagesDir</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The directory containing your page route files. Defaults to{" "}
        <span className="text-foreground">src/pages</span>. Each{" "}
        <span className="text-foreground">.tsx</span> file becomes a route based on its file path.
      </p>

      <h2 className="text-xl">layoutsDir</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The directory for root layout components. Layouts wrap pages and can be nested using the{" "}
        <span className="text-foreground">_layout.tsx</span> convention inside page directories.
      </p>

      <h2 className="text-xl">apiDir</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The directory for API route files. Files here respond to HTTP methods (
        <span className="text-foreground">GET</span>, <span className="text-foreground">POST</span>,
        etc.) and are served under <span className="text-foreground">/api/...</span>.
      </p>

      <h2 className="text-xl">actionsDir</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The directory for server functions. Exported async functions can be called from the browser
        via <span className="text-foreground">fetch('/__x/actions/...')</span>. If you don't set
        this, X auto-detects a <span className="text-foreground">src/actions</span> directory.
      </p>

      <h2 className="text-xl">contentDir</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The directory for markdown content collections. Files with frontmatter are scanned, and each
        becomes a route at its own path. Load content via{" "}
        <span className="text-foreground">scanContent</span> and{" "}
        <span className="text-foreground">renderMarkdown</span>.
      </p>

      <h2 className="text-xl">port</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The port number for the dev server. Defaults to{" "}
        <span className="text-foreground">3000</span>.
      </p>

      <h2 className="text-xl">security</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Nested options for the security guardrails: <span className="text-foreground">csrf</span>{" "}
        (origin verification + optional double-submit token),{" "}
        <span className="text-foreground">headers</span> (CSP, HSTS, frame options, nosniff), and{" "}
        <span className="text-foreground">rateLimit</span> (per-IP fixed-window limiter, optionally
        backed by a Redis store). Pass <span className="text-foreground">false</span> for any of
        them to disable it. See{" "}
        <a href="/docs/security" className="text-primary underline underline-offset-2">
          Security
        </a>{" "}
        for the full reference.
      </p>

      <h2 className="text-xl">observability</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">logging</span> toggles structured JSON request logs,
        <span className="text-foreground"> health</span> enables the{" "}
        <span className="text-foreground">/healthz</span> and{" "}
        <span className="text-foreground">/readyz</span> probes, and{" "}
        <span className="text-foreground">errorReporter</span> plugs exceptions into Sentry, OTel,
        or your own handler. See{" "}
        <a href="/docs/observability" className="text-primary underline underline-offset-2">
          Observability
        </a>
        .
      </p>

      <h2 className="text-xl">images</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">remoteHosts</span> allow-lists hosts for the{" "}
        <span className="text-foreground">/_x/image?url=...</span> proxy, so a strict{" "}
        <span className="text-foreground">img-src 'self'</span> CSP can still load remote images
        through your own origin.
      </p>

      <h2 className="text-xl">routesDir (legacy)</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        A legacy option for projects migrating from earlier versions of X. Maps to the same
        file-based routing convention. Prefer <span className="text-foreground">pagesDir</span> for
        new projects.
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
