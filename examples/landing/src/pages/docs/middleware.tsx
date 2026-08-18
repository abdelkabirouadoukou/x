import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Middleware</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Middleware</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Route-level middleware lets you intercept page requests before they reach the page handler.
        Use it for authentication, redirects, logging, and validation.
      </p>

      <h2 className="text-xl">The _middleware.ts convention</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Place a <span className="text-foreground">_middleware.ts</span> file in any route directory.
        It runs for all routes in that directory and its subdirectories.
      </p>
      <CodeBlock
        label="file tree"
        lang="tree"
        code={`pages/
  _middleware.ts         -> runs for all routes
  index.tsx
  dashboard/
    _middleware.ts       -> runs only for /dashboard/*
    settings.tsx
    profile.tsx
  admin/
    _middleware.ts       -> auth check for /admin/*
    index.tsx`}
      />

      <h2 className="text-xl">Middleware context</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        A middleware function receives a context object with{" "}
        <span className="text-foreground">params</span> (dynamic route params) and{" "}
        <span className="text-foreground">request</span> (the original Request), plus a{" "}
        <span className="text-foreground">next</span> function as the second argument to continue
        the chain. It returns a <span className="text-foreground">Response</span>.
      </p>
      <CodeBlock
        label="src/pages/_middleware.ts"
        code={`import type { MiddlewareContext, MiddlewareNext } from "@thexjs/core";

export async function middleware(ctx: MiddlewareContext, next: MiddlewareNext) {
  console.log(\`[${"$"}{ctx.request.method}] ${"$"}{ctx.request.url}\`);
  return next();
}`}
      />

      <h2 className="text-xl">Auth middleware example</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        A common use case is checking for an auth cookie and redirecting unauthenticated users.
      </p>
      <CodeBlock
        label="src/pages/dashboard/_middleware.ts"
        code={`import type { MiddlewareContext, MiddlewareNext } from "@thexjs/core";

export async function middleware(ctx: MiddlewareContext, next: MiddlewareNext) {
  const session = ctx.request.headers.get("cookie");

  if (!session) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  const user = await validateSession(session);
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  return next();
}`}
      />

      <h2 className="text-xl">MiddlewareNext</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Call <span className="text-foreground">next()</span> (no arguments) to pass control to the
        next middleware or the route handler. Any mutations to{" "}
        <span className="text-foreground">ctx.params</span> you make before the call flow through to
        downstream handlers.
      </p>
      <p className="mt-4 text-muted-foreground">
        Middleware applies to page routes only. API routes (in{" "}
        <span className="text-foreground">apiDir</span>) and content routes are dispatched without a
        middleware chain.
      </p>

      <h2 className="text-xl">composeMiddleware</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The <span className="text-foreground">_middleware.ts</span> convention builds a single
        handler under the hood, but you can also wire middleware yourself with{" "}
        <span className="text-foreground">composeMiddleware(fns, handler)</span>. It folds an array
        of middleware functions into one onion-style chain that reaches{" "}
        <span className="text-foreground">handler</span> only after every{" "}
        <span className="text-foreground">next()</span> has been called.
      </p>
      <CodeBlock
        label="src/middleware.ts"
        code={`import { composeMiddleware } from "@thexjs/core";
import type { MiddlewareContext } from "@thexjs/core";

function enforceAuth(ctx: MiddlewareContext, next: () => Promise<Response>) {
  const session = ctx.request.headers.get("cookie");
  if (!session) return new Response(null, { status: 302, headers: { Location: "/login" } });
  return next();
}

function attachUser(ctx: MiddlewareContext, next: () => Promise<Response>) {
  ctx.params.role = "viewer";
  return next();
}

const wrapped = composeMiddleware(
  [enforceAuth, attachUser],
  (ctx) => new Response(\`role: \${"$"}{ctx.params.role}\`),
);`}
      />
      <p className="mt-4 text-muted-foreground">
        Calling <span className="text-foreground">next()</span> more than once in the same
        middleware throws ("next() called multiple times"), which catches double-dispatch bugs at
        runtime.
      </p>

      <h2 className="text-xl">Redirect patterns</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Return a <span className="text-foreground">Response</span> with a 302 status and a{" "}
        <span className="text-foreground">Location</span> header to redirect. You can also return
        JSON responses for API middleware validation errors.
      </p>
      <CodeBlock
        label="redirect example"
        code={`// Redirect to login
return new Response(null, {
  status: 302,
  headers: { Location: "/login?redirect=" + ctx.request.url },
});

// Redirect back after successful auth
const url = new URL(ctx.request.url);
const redirectTo = url.searchParams.get("redirect") || "/";
return new Response(null, {
  status: 302,
  headers: { Location: redirectTo },
});`}
      />

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
