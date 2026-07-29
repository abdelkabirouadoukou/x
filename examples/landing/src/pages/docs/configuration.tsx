import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Configuration</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Configuration</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Configure x via <span className="text-foreground">x.config.ts</span> at your project root.
        Use <span className="text-foreground">defineConfig</span> from{" "}
        <span className="text-foreground">@thexjs/core</span> for type-safe configuration.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">defineConfig</h2>
      <p className="mt-3 text-muted-foreground">
        All configuration options are optional. x provides sensible defaults so you can start with
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

  // Legacy routes directory
  routesDir: "src/routes",
});`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">All options reference</h2>

      <CodeBlock
        label="options table"
        code={`Option         Type       Default          Description
────────────────────────────────────────────────────────────
pagesDir       string     "src/pages"      File-based page routes
layoutsDir     string     "src/layouts"    Root layout directory
apiDir         string     "src/api"        File-based API routes
actionsDir     string     "src/actions"    Server functions
contentDir     string     "content"        Markdown content collections
port           number     3000             Dev server port
routesDir      string     undefined        Legacy routes directory`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">pagesDir</h2>
      <p className="mt-3 text-muted-foreground">
        The directory containing your page route files. Defaults to{" "}
        <span className="text-foreground">src/pages</span>. Each{" "}
        <span className="text-foreground">.tsx</span> file becomes a route based on its file path.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">layoutsDir</h2>
      <p className="mt-3 text-muted-foreground">
        The directory for root layout components. Layouts wrap pages and can be nested using the{" "}
        <span className="text-foreground">_layout.tsx</span> convention inside page directories.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">apiDir</h2>
      <p className="mt-3 text-muted-foreground">
        The directory for API route files. Files here respond to HTTP methods (
        <span className="text-foreground">GET</span>, <span className="text-foreground">POST</span>,
        etc.) and are served under <span className="text-foreground">/api/...</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">actionsDir</h2>
      <p className="mt-3 text-muted-foreground">
        The directory for server functions. Exported async functions can be called from the browser
        via <span className="text-foreground">fetch('/__x/actions/...')</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">contentDir</h2>
      <p className="mt-3 text-muted-foreground">
        The directory for markdown content collections. Files with frontmatter are scanned and can
        be loaded via <span className="text-foreground">scanContent</span> and{" "}
        <span className="text-foreground">renderMarkdown</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">port</h2>
      <p className="mt-3 text-muted-foreground">
        The port number for the dev server. Defaults to{" "}
        <span className="text-foreground">3000</span>. Set to a different value if the default port
        is in use.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">routesDir (legacy)</h2>
      <p className="mt-3 text-muted-foreground">
        A legacy option for projects migrating from earlier versions of x. Maps to the same
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
