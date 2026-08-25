import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Packages</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">
        @thexjs/adapter-vercel
      </h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Vercel{" "}
        <a
          href="https://vercel.com/docs/build-output-api/v3"
          className="text-primary underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Build Output API v3
        </a>{" "}
        adapter for X apps. Produces a <span className="text-foreground">.vercel/output/</span> tree
        directly, with <span className="text-foreground">no vercel.json required</span>.
      </p>

      <CodeBlock
        label="terminal"
        lang="bash"
        code={`bun add -d @thexjs/adapter-vercel
x build --adapter vercel
vercel deploy --prebuilt`}
      />

      <h2 className="text-xl">What it produces</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The adapter writes a complete Build Output API v3 tree:
      </p>
      <CodeBlock
        label="output tree"
        lang="tree"
        code={`.vercel/output/
  config.json                    routes: filesystem first, then fallback -> render
  static/                        HTML, CSS, island JS chunks (served via Vercel's CDN)
  functions/render.func/
    .vc-config.json              runtime: nodejs20.x, handler: index.mjs
    index.mjs                    standalone SSR + API bundle`}
      />
      <p className="mt-4 text-muted-foreground">
        If your app is 100% static (every page is{" "}
        <span className="text-foreground">mode = "static"</span>, no API routes, no server actions),
        no function is emitted at all. <span className="text-foreground">config.json</span> only
        does filesystem routing.
      </p>

      <h2 className="text-xl">How it works</h2>
      <ol className="mt-4 list-decimal space-y-4 text-muted-foreground">
        <li>
          Runs <span className="text-foreground">@thexjs/core</span>'s normal{" "}
          <span className="text-foreground">build()</span> to prerender every static-mode page and
          content entry, and to compile island bundles. This becomes{" "}
          <span className="text-foreground">static/</span>.
        </li>
        <li>
          Separately resolves every <span className="text-foreground">server-mode</span> page, API
          route, layout, middleware file, and server-action file{" "}
          <span className="text-foreground">at build time</span> (reusing{" "}
          <span className="text-foreground">@thexjs/core</span>'s own scanners), so nothing at
          request time depends on walking the filesystem or on a dynamic{" "}
          <span className="text-foreground">import(path)</span> of a{" "}
          <span className="text-foreground">.tsx</span> file; both of those only work under Bun.
        </li>
        <li>
          Transpiles each of those files from Bun-flavored TSX/TS into plain Node ESM, then bundles
          them together with <span className="text-foreground">@thexjs/core</span> and React into
          one standalone <span className="text-foreground">index.mjs</span>.
        </li>
        <li>
          Bridges Vercel's Node-style <span className="text-foreground">(req, res)</span> function
          invocation to X's Web-standard <span className="text-foreground">Request</span>/{" "}
          <span className="text-foreground">Response</span> handler, streaming the response body
          through (so <span className="text-foreground">renderToReadableStream</span>
          -based SSR streams end-to-end, not just non-streaming pages).
        </li>
      </ol>

      <h2 className="text-xl">Options</h2>
      <CodeBlock
        label="VercelAdapterOptions"
        code={`interface VercelAdapterOptions {
  projectRoot?: string;
  pagesDir?: string;
  routesDir?: string;
  apiDir?: string;
  layoutsDir?: string;
  actionsDir?: string;
  contentDir?: string;
  outputDir?: string;           // default: ".vercel/output"
  runtime?: "nodejs18.x" | "nodejs20.x" | "nodejs22.x";
  additionalStaticDirs?: string[];
  security?: {
    csrf?: { allowedOrigins?: string[]; requireToken?: boolean; disabled?: boolean };
    headers?:
      | {
          contentSecurityPolicy?: string;
          hstsMaxAge?: number;
          hstsIncludeSubDomains?: boolean;
          frameOptions?: string;
          contentTypeOptions?: string;
          referrerPolicy?: string;
        }
      | false;
    rateLimit?: { limit?: number; windowMs?: number } | false;
  };
  observability?: {
    logging?: boolean;          // default: true
  };
}`}
      />
      <p className="mt-4 text-muted-foreground">
        The adapter accepts the same directory options as{" "}
        <span className="text-foreground">x.config.ts</span>. Security and observability options are
        forwarded into the generated render function so your Vercel deployment gets the same CSRF
        protection, security headers, rate limiting, and structured logging as your Bun server.
      </p>

      <h2 className="text-xl">Usage with x.config.ts</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Running <span className="text-foreground">x build --adapter vercel</span> loads your{" "}
        <span className="text-foreground">x.config.ts</span>, so no extra configuration is needed.
        Just install the adapter and run:
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`bun add -d @thexjs/adapter-vercel
x build --adapter vercel
vercel deploy --prebuilt`}
      />

      <h2 className="text-xl">Known limitations</h2>
      <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          ISR-style <span className="text-foreground">revalidate</span> caching (in-memory in the
          long-running Bun dev/prod server) doesn't carry over to stateless serverless invocations.
          Use Vercel's own <span className="text-foreground">Cache-Control</span>/CDN caching on the
          response instead.
        </li>
        <li>
          Markdown <span className="text-foreground">contentDir</span> entries are always statically
          prerendered (matching <span className="text-foreground">@thexjs/core</span>'s{" "}
          <span className="text-foreground">build()</span> behavior today). There's no server-mode
          content route yet.
        </li>
        <li>
          Custom <span className="text-foreground">errorReporter</span> functions and{" "}
          <span className="text-foreground">health.checks</span> cannot be serialized into the
          standalone serverless bundle. The adapter provides{" "}
          <span className="text-foreground">/healthz</span> (liveness) without custom readiness
          checks.
        </li>
      </ul>

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/packages/core"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          @thexjs/core <ArrowRight className="h-3.5 w-3.5" />
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
