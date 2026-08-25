import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Packages</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">@thexjs/mcp</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        An MCP (Model Context Protocol) server that gives AI coding agents grounded, accurate
        knowledge of X. Instead of letting an agent pattern-match to Next.js, Remix, Astro, or
        TanStack Start syntax that looks similar but behaves differently, the agent asks this server
        and gets the framework's actual conventions.
      </p>

      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Every app created with <span className="text-foreground">create-thexjs-app</span> already
        ships wired up: <span className="text-foreground">.mcp.json</span> for Claude Code and{" "}
        <span className="text-foreground">.cursor/mcp.json</span> for Cursor point at{" "}
        <span className="text-foreground">bunx @thexjs/mcp</span>. To add it to an existing project
        by hand, drop this file at the project root:
      </p>

      <CodeBlock
        label=".mcp.json"
        lang="json"
        code={`{
  "mcpServers": {
    "thexjs": {
      "command": "bunx",
      "args": ["@thexjs/mcp"]
    }
  }
}`}
      />

      <h2 className="text-xl">Tools</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 font-medium text-foreground">Tool</th>
              <th className="py-2 pr-4 font-medium text-foreground">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">list_topics()</td>
              <td className="py-2 pr-4">
                Lists every doc topic available for X. Call this first to see what exists, then
                fetch individual topics with get_docs.
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">get_docs(topic)</td>
              <td className="py-2 pr-4">
                Returns grounded reference docs for one topic (routing, loaders, static-vs-ssr,
                layouts, middleware, api-routes, actions, config, env, auth, data, images, content,
                navigation, cli, gotchas). Includes explicit corrections for the conventions agents
                most often get wrong.
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">search_docs(query)</td>
              <td className="py-2 pr-4">
                Full-text search across all topics, for when the exact topic id is unknown.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">
                scaffold_file(kind, name)
              </td>
              <td className="py-2 pr-4">
                Generates a correctly-shaped file (page, dynamic-page, layout, middleware,
                api-route, action) with the right exports, path, and conventions, ready to paste.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl">Why it exists</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        X deliberately diverges from similar frameworks in a few specific places: server functions
        have no <span className="text-foreground">"use server"</span> directives, special files are
        underscore-prefixed (<span className="text-foreground">_layout.tsx</span>,{" "}
        <span className="text-foreground">_middleware.ts</span>), public env vars must carry the{" "}
        <span className="text-foreground">THEXJS_PUBLIC_</span> prefix, and loaders receive{" "}
        <span className="text-foreground">{"{ params, request }"}</span> rather than a context
        object. Those are exactly the details a general-purpose coding agent gets wrong from
        training data alone. This server grounds the agent in real conventions before it writes
        code.
      </p>

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/packages/hooks"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          @thexjs/hooks <ArrowRight className="h-3.5 w-3.5" />
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
