import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Getting Started
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Get started with x</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Create a new x project, learn the project structure, and build your first page.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Create a project</h2>
      <p className="mt-3 text-muted-foreground">
        The fastest way to start is with the project scaffolder. See{" "}
        <a href="/docs/installation" className="text-primary underline underline-offset-2">
          Installation
        </a>{" "}
        for prerequisites and template options. Quick version:
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`bun create thexjs-app@latest my-app
cd my-app
bun run dev`}
      />
      <p className="mt-4 text-muted-foreground">
        Press Enter at the template prompt to use <span className="text-foreground">default</span>{" "}
        (recommended), a single home page. Your app will be running at{" "}
        <span className="text-foreground">http://localhost:3000</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Manual setup</h2>
      <p className="mt-3 text-muted-foreground">
        If you prefer to set up manually, create a directory and add x:
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`mkdir my-app && cd my-app
bun init -y
bun add @thexjs/core
cat << EOF > x.config.ts
import { defineConfig } from "@thexjs/core";
export default defineConfig({
  pagesDir: "src/pages",
  apiDir: "src/api",       // optional: API routes
  actionsDir: "src/actions", // optional: server functions
});
EOF`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Project structure</h2>
      <p className="mt-3 text-muted-foreground">A typical x project looks like this:</p>
      <CodeBlock
        label="file tree"
        lang="tree"
        code={`my-app/
  x.config.ts
  src/
    pages/  // File-based routes
      index.tsx
      about.tsx
      _404.tsx
      blog/
        [slug].tsx
    layouts/ // Nested layouts
      main.tsx
    api/    // API routes
      hello.ts
    actions/ // Server functions
      greet.ts
  content/  // Markdown content
    posts/
      hello-world.md`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Your first page</h2>
      <p className="mt-3 text-muted-foreground">
        Create <span className="text-foreground">src/pages/index.tsx</span> with a simple component:
      </p>
      <CodeBlock
        label="src/pages/index.tsx"
        code={`export default function Home() {
  return (
    <div>
      <h1 className="text-4xl font-bold">Hello x!</h1>
      <p className="text-muted-foreground">Welcome to your new app.</p>
    </div>
  );
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Running the dev server</h2>
      <p className="mt-3 text-muted-foreground">Start the development server with hot reload:</p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`x dev
[x] dev server starting...
✓ dev server running at http://localhost:3000`}
      />
      <p className="mt-4 text-muted-foreground">
        The dev server watches your <span className="text-foreground">src/</span> directory and
        automatically reloads when files change.
      </p>

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/routing"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Routing <ArrowRight className="h-3.5 w-3.5" />
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
