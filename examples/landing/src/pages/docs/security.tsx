import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Security</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Security</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        x ships with production-grade security guardrails enabled by default — build-time env
        isolation, CSRF protection on server actions, security headers on every response, and an
        in-memory rate limiter. All of it is configurable or disableable per environment.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Configuration overview</h2>
      <p className="mt-3 text-muted-foreground">
        Security options live under the <span className="text-foreground">security</span> key in{" "}
        <span className="text-foreground">x.config.ts</span>:
      </p>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig } from "@thexjs/core";

export default defineConfig({
  // ...pagesDir, apiDir, etc.
  security: {
    csrf: {
      allowedOrigins: ["https://app.example.com"],
      requireToken: true,
    },
    headers: {
      contentSecurityPolicy: "default-src 'self'; script-src 'self'",
      hstsMaxAge: 31536000,
    },
    rateLimit: {
      limit: 100,
      windowMs: 60_000,
    },
  },
});`}
      />
      <p className="mt-4 text-muted-foreground">
        To disable any guardrail entirely, pass <span className="text-foreground">false</span>:
      </p>
      <CodeBlock
        label="disable all security"
        code={`security: {
  csrf: false,
  headers: false,
  rateLimit: false,
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Build-time env isolation</h2>
      <p className="mt-3 text-muted-foreground">
        Only variables prefixed with <span className="text-foreground">THEXJS_PUBLIC_</span> may
        ever reach browser code. During <span className="text-foreground">x build</span>, the
        bundler scans every client-shipped bundle for references to{" "}
        <span className="text-foreground">process.env.*</span>,{" "}
        <span className="text-foreground">Bun.env.*</span>, or{" "}
        <span className="text-foreground">import.meta.env.*</span> that are not public — and if it
        finds any, the build halts with an <span className="text-foreground">EnvLeakageError</span>.
      </p>
      <CodeBlock
        label="build error"
        code={`[x] server-only environment variable(s) leaked into client bundle "src/components/widget.tsx":
  DATABASE_URL, STRIPE_SECRET_KEY.
  Only "THEXJS_PUBLIC_*" variables may be referenced in client-shipped code —
  move this access into a loader, server function, or API route.`}
      />
      <p className="mt-4 text-muted-foreground">
        This check runs on island hydration bundles too, so even selectively-hydrated components
        can't accidentally ship secrets. Move env access into a loader or server function and pass
        the value as <span className="text-foreground">loaderData</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">CSRF protection</h2>
      <p className="mt-3 text-muted-foreground">
        All POST requests to <span className="text-foreground">/__x/actions/*</span> (server
        functions) are automatically verified. Two independent checks are available:
      </p>
      <ol className="mt-4 list-decimal space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">Origin/Referer verification</span> — rejects cross-site
          requests whose Origin or Referer doesn't match the app's own origin. This is always on
          unless CSRF is disabled entirely.
        </li>
        <li>
          <span className="text-foreground">Double-submit token</span> — when{" "}
          <span className="text-foreground">requireToken: true</span> is set, a random token is
          issued in a cookie and must be echoed back in the{" "}
          <span className="text-foreground">x-csrf-token</span> header on mutating requests.
        </li>
      </ol>

      <h3 className="mt-8 text-lg font-semibold">Options</h3>
      <CodeBlock
        label="CsrfOptions"
        code={`interface CsrfOptions {
  allowedOrigins?: string[];   // e.g. ["https://app.example.com"]
  requireToken?: boolean;      // default: false
  disabled?: boolean;          // default: false
}`}
      />

      <h3 className="mt-8 text-lg font-semibold">Using CSRF tokens from the browser</h3>
      <p className="mt-2 text-muted-foreground">
        When <span className="text-foreground">requireToken</span> is enabled, read the cookie and
        send it back as a header:
      </p>
      <CodeBlock
        label="client"
        code={`// The cookie is set automatically by the server on the first response.
// Read it and echo it on every POST to /__x/actions/*.
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)x_csrf_token=([^;]+)/);
  return match ? match[1] : "";
}

await fetch("/__x/actions/greet/greet", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-csrf-token": getCsrfToken(),
  },
  body: JSON.stringify(["world"]),
});`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Security headers</h2>
      <p className="mt-3 text-muted-foreground">
        Every response gets a set of security headers by default. These are applied by{" "}
        <span className="text-foreground">applySecurityHeaders</span> in the request pipeline and
        can be customized or disabled:
      </p>
      <CodeBlock
        label="SecurityHeadersOptions"
        code={`interface SecurityHeadersOptions {
  contentSecurityPolicy?: string | false;   // default: conservative same-origin CSP
  hstsMaxAge?: number | false;              // default: 15552000 (180 days)
  hstsIncludeSubDomains?: boolean;          // default: true
  frameOptions?: string | false;            // default: "DENY"
  contentTypeOptions?: string | false;      // default: "nosniff"
  referrerPolicy?: string | false;          // default: "strict-origin-when-cross-origin"
}`}
      />
      <p className="mt-4 text-muted-foreground">
        The default CSP allows inline styles (for Tailwind) but blocks inline scripts and external
        resources. If you need to allow a specific domain, override the entire value:
      </p>
      <CodeBlock
        label="custom CSP"
        code={`security: {
  headers: {
    contentSecurityPolicy:
      "default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https://images.unsplash.com",
  },
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Rate limiting</h2>
      <p className="mt-3 text-muted-foreground">
        A lightweight in-memory rate limiter is applied ahead of all routing. It uses a fixed-window
        counter keyed by client IP (from <span className="text-foreground">x-forwarded-for</span> or{" "}
        <span className="text-foreground">x-real-ip</span>). When the limit is exceeded, the server
        returns a <span className="text-foreground">429 Too Many Requests</span> with a{" "}
        <span className="text-foreground">Retry-After</span> header.
      </p>
      <CodeBlock
        label="RateLimitOptions"
        code={`interface RateLimitOptions {
  limit?: number;                     // default: 60 requests
  windowMs?: number;                  // default: 60_000 (1 minute)
  keyFn?: (req: Request) => string;   // custom bucket key (e.g. by user ID)
}`}
      />
      <p className="mt-4 text-muted-foreground">
        This is a single-process limiter — for multi-instance deployments, front it with a shared
        store (Redis, etc.) via a custom <span className="text-foreground">keyFn</span> or use a
        reverse proxy with its own rate limiting.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Disabling security</h2>
      <p className="mt-3 text-muted-foreground">
        For local development or testing, you can disable everything:
      </p>
      <CodeBlock
        label="disable all"
        code={`export default defineConfig({
  security: {
    csrf: false,
    headers: false,
    rateLimit: false,
  },
});`}
      />
      <p className="mt-4 text-muted-foreground">
        Individual guards can be toggled independently. CSRF and headers are{" "}
        <span className="text-foreground">on</span> by default in production; rate limiting is{" "}
        <span className="text-foreground">on</span> by default in both dev and production.
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
