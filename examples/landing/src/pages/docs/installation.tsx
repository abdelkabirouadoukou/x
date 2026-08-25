import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock, TerminalBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Installation</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Install x</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        X requires the Bun runtime. Scaffold a new project with the create command, or add the
        packages manually to an existing app.
      </p>

      <h2 className="text-xl">Prerequisites</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Install{" "}
        <a href="https://bun.sh" className="text-primary underline underline-offset-2">
          Bun
        </a>{" "}
        first, since X uses <span className="text-foreground">Bun.serve</span>,{" "}
        <span className="text-foreground">Bun.file</span>, and other Bun-only APIs. Verify with:
      </p>
      <TerminalBlock label="terminal · bun" code="bun --version" />

      <h2 className="text-xl">Create a new project</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The fastest path is the project scaffolder. It generates{" "}
        <span className="text-foreground">package.json</span>, resolves the latest{" "}
        <span className="text-foreground">@thexjs/core</span> and{" "}
        <span className="text-foreground">@thexjs/cli</span> versions, and runs{" "}
        <span className="text-foreground">bun install</span>.
      </p>
      <TerminalBlock
        label="~/projects · zsh"
        code={`bun create thexjs-app@latest my-app
cd my-app
bun run dev`}
      />
      <p className="mt-4 text-muted-foreground">
        The scaffolder is feature-based: it prompts with a multi-select of{" "}
        <span className="text-foreground">tailwind</span>,{" "}
        <span className="text-foreground">auth</span>,{" "}
        <span className="text-foreground">content</span>,{" "}
        <span className="text-foreground">hooks</span>, and{" "}
        <span className="text-foreground">shadcn</span>; pick nothing for a plain blank project.
        Ready-made example apps live under <span className="text-foreground">examples/</span> in the
        repo if you prefer a fuller starting point.
      </p>
      <p className="mt-4 text-muted-foreground">
        Pass features non-interactively instead: <span className="text-foreground">--tailwind</span>
        , <span className="text-foreground">--auth</span>,{" "}
        <span className="text-foreground">--content</span>,{" "}
        <span className="text-foreground">--hooks</span>,{" "}
        <span className="text-foreground">--shadcn</span>. Also available:{" "}
        <span className="text-foreground">--no-install</span> (skip{" "}
        <span className="text-foreground">bun install</span>).
      </p>
      <TerminalBlock
        label="~/projects · zsh"
        code="bun create thexjs-app@latest my-app --tailwind --auth"
      />

      <h2 className="text-xl">Add to an existing project</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Install the core packages and wire up scripts in{" "}
        <span className="text-foreground">package.json</span>:
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`bun add @thexjs/core
bun add -d @thexjs/cli`}
      />
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
      <p className="mt-4 text-muted-foreground">
        Create <span className="text-foreground">x.config.ts</span> at the project root:
      </p>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "./src/pages",
  port: 3000,
});`}
      />

      <h2 className="text-xl">Optional: environment validation</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Add <span className="text-foreground">@thexjs/env</span> when you want typed, validated
        environment variables:
      </p>
      <CodeBlock label="terminal" lang="bash" code="bun add @thexjs/env" />
      <p className="mt-4 text-muted-foreground">
        See the{" "}
        <a href="/docs/packages/env" className="text-primary underline underline-offset-2">
          @thexjs/env docs
        </a>{" "}
        for the full API.
      </p>

      <h2 className="text-xl">Verify the install</h2>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`x dev
[x] compiling Tailwind CSS...
[x] dev server starting...
✓ dev server running at http://localhost:3000`}
      />
      <p className="mt-4 text-muted-foreground">
        (The Tailwind line only appears when{" "}
        <span className="text-foreground">src/styles/globals.css</span> exists, which the default
        template ships.)
      </p>

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/getting-started"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Getting started <ArrowRight className="h-3.5 w-3.5" />
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
