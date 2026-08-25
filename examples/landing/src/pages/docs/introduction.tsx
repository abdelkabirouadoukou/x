import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Introduction</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">What is X?</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        X is a full-stack React framework built on{" "}
        <a href="https://bun.sh" className="text-primary underline underline-offset-2">
          Bun
        </a>
        . File-based routing, SSR, static generation, API routes, server functions, islands, and a
        content layer all live in one process, with zero orchestration.
      </p>

      <h2 className="text-xl">Why X exists</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Most stacks split concerns across multiple tools: a bundler, a server, a static host, a
        separate API layer. X keeps everything in one Bun process. Drop a file in{" "}
        <span className="text-foreground">src/pages</span>, get a route. Mark a page{" "}
        <span className="text-foreground">static</span> and it prerenders at build time. Leave it as
        server mode and it renders per request. API routes and server functions live alongside your
        pages, with the same types and the same runtime.
      </p>

      <h2 className="text-xl">The packages</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        X ships as a set of focused npm packages. You typically install{" "}
        <span className="text-foreground">@thexjs/cli</span> and{" "}
        <span className="text-foreground">@thexjs/core</span> through the project scaffolder; add{" "}
        <span className="text-foreground">@thexjs/env</span> when you need validated environment
        variables, <span className="text-foreground">@thexjs/hooks</span> for SSR-safe React hooks,
        and <span className="text-foreground">@thexjs/adapter-vercel</span> to deploy to Vercel.
      </p>
      <div className="mt-6 space-y-3">
        {[
          {
            name: "@thexjs/core",
            href: "/docs/packages/core",
            desc: "Rendering engine: routing, SSR/SSG, islands, server functions, content, data layer.",
          },
          {
            name: "@thexjs/cli",
            href: "/docs/packages/cli",
            desc: "The x command: dev server, production build, and start.",
          },
          {
            name: "@thexjs/env",
            href: "/docs/packages/env",
            desc: "Type-safe environment variable validation with fail-fast errors.",
          },
          {
            name: "@thexjs/hooks",
            href: "/docs/packages/hooks",
            desc: "SSR-safe React hooks: debounce, media query, localStorage, server actions, forms.",
          },
        ].map((pkg) => (
          <a
            key={pkg.name}
            href={pkg.href}
            className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-card/80"
          >
            <p className="font-mono text-sm font-semibold text-primary">{pkg.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{pkg.desc}</p>
          </a>
        ))}
      </div>

      <h2 className="text-xl">A minimal page</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Every X app starts with file-based routes. Here is the simplest possible page:
      </p>
      <CodeBlock
        label="src/pages/index.tsx"
        code={`import type { RouteProps } from "@thexjs/core";

export const mode = "static";

export default function HomePage({}: RouteProps) {
  return <h1>Hello from x</h1>;
}`}
      />
      <p className="mt-4 text-muted-foreground">
        Run <span className="text-foreground">x dev</span> and visit{" "}
        <span className="text-foreground">http://localhost:3000</span>. That is the entire loop.
      </p>

      <h2 className="text-xl">Static vs server</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Pages default to server-rendered (SSR). Opt into build-time prerendering per page:
      </p>
      <CodeBlock label="route mode" code={`export const mode: "static" | "server" = "static";`} />
      <p className="mt-4 text-muted-foreground">
        Static pages ship as plain HTML in <span className="text-foreground">.x/client/</span> and
        deploy to any static host. Server pages need a running Bun process via{" "}
        <span className="text-foreground">x start</span>.
      </p>

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/installation"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Install X <ArrowRight className="h-3.5 w-3.5" />
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
