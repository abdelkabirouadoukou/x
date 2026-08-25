import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Security</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Security</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        X ships with production-grade security guardrails enabled by default: build-time env
        isolation, CSRF protection on server actions, security headers on every response, and a
        per-IP rate limiter. All of it is configurable or disableable per environment.
      </p>

      <h2 className="text-xl">Configuration overview</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
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

      <h2 className="text-xl">Build-time env isolation</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Only variables prefixed with <span className="text-foreground">THEXJS_PUBLIC_</span> may
        ever reach browser code. During <span className="text-foreground">x build</span>, the
        bundler scans every client-shipped bundle for references to{" "}
        <span className="text-foreground">process.env.*</span>,{" "}
        <span className="text-foreground">Bun.env.*</span>, or{" "}
        <span className="text-foreground">import.meta.env.*</span> that are not public. If it finds
        any, the build halts with an <span className="text-foreground">EnvLeakageError</span>.
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
      <p className="mt-4 text-muted-foreground">
        The low-level pieces are exported too:{" "}
        <span className="text-foreground">findLeakedEnvKeys(code)</span>,{" "}
        <span className="text-foreground">assertNoEnvLeakage(code, file)</span>, and the{" "}
        <span className="text-foreground">PUBLIC_ENV_PREFIX</span> constant, both handy for custom
        build tooling or CI checks.
      </p>

      <h2 className="text-xl">CSRF protection</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        All requests to <span className="text-foreground">/__x/actions/*</span> (server functions)
        are verified. Two independent checks are available:
      </p>
      <ol className="mt-4 list-decimal space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">Origin/Referer verification</span> rejects cross-site
          requests whose Origin or Referer doesn't match the app's own origin. This is always on
          unless CSRF is disabled entirely.
        </li>
        <li>
          <span className="text-foreground">Double-submit token</span>: when{" "}
          <span className="text-foreground">requireToken: true</span> is set, a token must be echoed
          in the <span className="text-foreground">x-csrf-token</span> header on mutating requests.
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

      <h3 className="mt-8 text-lg font-semibold">Issuing the token cookie</h3>
      <p className="mt-2 text-muted-foreground">
        The token cookie is <span className="text-foreground">not</span> set automatically: your app
        sets it once, typically when a session starts (a login route), by wrapping the response with{" "}
        <span className="text-foreground">withCsrfCookie</span>, or generate one yourself with{" "}
        <span className="text-foreground">generateCsrfToken</span>. From the browser, read the
        cookie and echo it on every POST to <span className="text-foreground">/__x/actions/*</span>:
      </p>
      <CodeBlock
        label="login route (sets the cookie)"
        code={`import { withCsrfCookie } from "@thexjs/core";

export async function POST(req: Request) {
  // ...create a session...
  return withCsrfCookie(req, Response.json({ ok: true }));
}`}
      />
      <CodeBlock
        label="client (echoes the token)"
        code={`function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\\s*)x_csrf_token=([^;]+)/);
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
      <p className="mt-4 text-muted-foreground">
        The other primitives are exported for custom pipelines:{" "}
        <span className="text-foreground">checkCsrf</span>,{" "}
        <span className="text-foreground">verifyOrigin</span>,{" "}
        <span className="text-foreground">verifyCsrfToken</span>.
      </p>
      <p className="mt-4 text-muted-foreground">
        The same module runs automatically on{" "}
        <a href="/docs/packages/auth" className="text-primary underline underline-offset-2">
          @thexjs/auth
        </a>{" "}
        endpoints: its POST routes (<span className="text-foreground">signin</span>,{" "}
        <span className="text-foreground">signout</span>) call{" "}
        <span className="text-foreground">checkCsrf</span> under the hood, so auth mutations get the
        same Origin/Referer (and optional double-submit token) verification as server functions, no
        extra wiring needed.
      </p>

      <h2 className="text-xl">Security headers</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
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
      <p className="mt-4 text-muted-foreground">
        To reuse the header builder without the request pipeline, call{" "}
        <span className="text-foreground">buildSecurityHeaders(options)</span> directly.
      </p>

      <h2 className="text-xl">Rate limiting</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        A lightweight fixed-window rate limiter is applied ahead of all routing. Buckets are keyed
        by the client's real IP, resolved from the underlying socket (Bun{" "}
        <span className="text-foreground">server.requestIP</span>), falling back to{" "}
        <span className="text-foreground">x-forwarded-for</span> /{" "}
        <span className="text-foreground">x-real-ip</span>. When the limit is exceeded, the server
        returns a <span className="text-foreground">429 Too Many Requests</span> with a{" "}
        <span className="text-foreground">Retry-After</span> header.
      </p>
      <CodeBlock
        label="RateLimitOptions"
        code={`interface RateLimitOptions {
  limit?: number;                     // default: 60 requests
  windowMs?: number;                  // default: 60_000 (1 minute)
  keyFn?: (req: Request) => string;   // custom bucket key (e.g. by user ID)
  store?: RateLimitStore;             // shared store for multi-instance
}`}
      />
      <p className="mt-4 text-muted-foreground">
        For multi-instance deployments, share counters with Redis via{" "}
        <span className="text-foreground">createRedisRateLimitStore</span> (uses Bun's built-in{" "}
        <span className="text-foreground">bun:redis</span>, no npm dependency):
      </p>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig, createRedisRateLimitStore } from "@thexjs/core";

export default defineConfig({
  security: {
    rateLimit: {
      limit: 120,
      store: createRedisRateLimitStore({ url: process.env.REDIS_URL }),
    },
  },
});`}
      />
      <p className="mt-4 text-muted-foreground">
        <span className="text-foreground">createRateLimiter</span> and{" "}
        <span className="text-foreground">rateLimitMiddleware</span> are also exported if you want
        to apply limits to a specific handler yourself (e.g. a login endpoint with a tighter
        budget).
      </p>

      <h2 className="text-xl">Disabling security</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
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
