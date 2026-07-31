import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Packages</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">@thexjs/core</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The rendering and routing engine behind x — file-based routing, SSR/SSG, islands, server
        functions, content collections, and a lightweight data layer.
      </p>

      <CodeBlock label="terminal" lang="bash" code="bun add @thexjs/core" />
      <p className="mt-4 text-sm text-muted-foreground">
        Requires Bun. You typically do not install this directly —{" "}
        <a href="/docs/packages/cli" className="text-primary underline underline-offset-2">
          @thexjs/cli
        </a>{" "}
        depends on it and drives <span className="text-foreground">x dev</span> /{" "}
        <span className="text-foreground">x build</span> /{" "}
        <span className="text-foreground">x start</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Quick start</h2>
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

      <h2 className="mt-12 text-xl font-bold tracking-tight">File-based routing</h2>
      <CodeBlock
        label="route mapping"
        code={`File                          Route
────────────────────────────────────────────
src/pages/index.tsx           /
src/pages/about.tsx           /about
src/pages/blog/[slug].tsx     /blog/:slug
src/pages/api/users.ts        API route at /api/users
src/pages/_layout.tsx         Wraps routes in directory
src/pages/_middleware.ts      Runs before matching routes
src/pages/_404.tsx              Custom not-found page`}
      />
      <p className="mt-4 text-muted-foreground">
        Files and directories prefixed with <span className="text-foreground">_</span> or{" "}
        <span className="text-foreground">.</span> are never treated as routes.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Route modes</h2>
      <p className="mt-3 text-muted-foreground">
        Every page defaults to server-rendered. Opt into build-time prerendering:
      </p>
      <CodeBlock
        label="src/pages/index.tsx"
        code={`export const mode: "static" | "server" = "static";`}
      />
      <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">static</span> — rendered once at build time to HTML in{" "}
          <span className="text-foreground">.x/client/</span>
        </li>
        <li>
          <span className="text-foreground">server</span> — rendered per request via{" "}
          <span className="text-foreground">x start</span> or{" "}
          <span className="text-foreground">x dev</span>
        </li>
      </ul>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Loaders</h2>
      <CodeBlock
        label="loader example"
        code={`import type { RouteProps } from "@thexjs/core";

export async function loader({ params }: { params: Record<string, string> }) {
  return { user: await getUser(params.id) };
}

export default function UserPage({ loaderData }: RouteProps<typeof loader>) {
  return <p>{loaderData.user.name}</p>;
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Islands</h2>
      <p className="mt-3 text-muted-foreground">
        Wrap interactive pieces in <span className="text-foreground">&lt;Island&gt;</span> for
        selective hydration:
      </p>
      <CodeBlock
        label="island"
        code={`import { Island } from "@thexjs/core";

<Island name="like-button" client="visible">
  <LikeButton />
</Island>`}
      />
      <p className="mt-4 text-muted-foreground">
        <span className="text-foreground">client</span> accepts{" "}
        <span className="text-foreground">"idle"</span>,{" "}
        <span className="text-foreground">"visible"</span>, or{" "}
        <span className="text-foreground">"load"</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Content collections</h2>
      <CodeBlock
        label="markdown"
        code={`import { scanContent, renderMarkdown } from "@thexjs/core";

const posts = scanContent("./src/content/blog");
const html = renderMarkdown(posts[0].body);`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Data layer</h2>
      <CodeBlock
        label="sqlite"
        code={`import { connectSQLite, runSQLiteMigrations } from "@thexjs/core/data";

const db = connectSQLite({ filename: "./data/dev.db" });
await runSQLiteMigrations(db, "./data/migrations");`}
      />
      <CodeBlock
        label="postgres"
        code={`import { connectPostgres, runPostgresMigrations } from "@thexjs/core/data";

const sql = connectPostgres({ url: process.env.DATABASE_URL! });
await runPostgresMigrations(sql, "./data/migrations");`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Key exports</h2>
      <CodeBlock
        label="exports"
        code={`defineConfig, createApp, build          App setup & build
renderPage, renderStaticPage            Lower-level rendering
scanRoutes, scanPages, scanApiDir       Routing internals
Island, IslandProvider                  Selective hydration
scanContent, renderMarkdown             Markdown content
composeMiddleware, MiddlewareFn         Route middleware
registerServerFunctions                 Server function internals
connectSQLite, connectPostgres          Data layer`}
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
