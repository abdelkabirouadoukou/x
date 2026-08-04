# @thexjs/core

The rendering/routing engine behind **x**, a full-stack React framework built on [Bun](https://bun.sh). This package provides file-based routing, SSR/SSG rendering, islands, server functions, a content layer, and a lightweight data layer (SQLite/Postgres).

You typically don't install this directly. [`@thexjs/cli`](https://www.npmjs.com/package/@thexjs/cli) depends on it and drives `x dev` / `x build` / `x start` for you. Install it explicitly only if you're calling the APIs below directly (e.g. a custom server entry).

```sh
bun add @thexjs/core
```

> Requires the Bun runtime. This package uses `Bun.serve`, `Bun.file`, `bun:sqlite`, and `Bun.sql` internally.

## Quick start

```ts
// x.config.ts
import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "./src/pages",
  contentDir: "./src/content",
  port: 3000,
});
```

```ts
// src/pages/index.tsx
import type { RouteProps } from "@thexjs/core";

export const mode = "static"; // prerender at build time (default is "server")

export default function HomePage({}: RouteProps) {
  return <h1>Hello from x</h1>;
}
```

Run it via the CLI: `x dev` (or `bun run dev` if that's wired up in your `package.json`).

## File-based routing

Given a `pagesDir`, `scanPages` walks the directory and maps files to routes:

| File | Route |
|---|---|
| `src/pages/index.tsx` | `/` |
| `src/pages/about.tsx` | `/about` |
| `src/pages/blog/[slug].tsx` | `/blog/:slug` |
| `src/pages/blog/[...rest].tsx` | `/blog/*` (catch-all) |
| `src/pages/_layout.tsx` | Wraps every route in the same directory (and below) |
| `src/pages/_middleware.ts` | Runs before matching routes in the same directory (and below) |
| `src/pages/_404.tsx` | Custom not-found page |
| `src/api/users.ts` | API route at `/api/users` (via `apiDir`) |

Files and directories prefixed with `_` or `.` are never treated as routes.

Underlying scanners (`scanRoutes`, `scanPages`, `scanApiDir`, `scanLayouts`, `scanLayoutsDir`, `scanMiddleware`, `scanNotFound`) and chain resolvers (`findLayoutChain`, `findMiddlewareChain`) are exported if you need to build custom tooling on top of the same conventions.

## Route modes: static vs. server

Every page defaults to **server-rendered (SSR)**. Opt into build-time prerendering per page:

```ts
export const mode: "static" | "server" = "static";
```

- **`static`**: rendered once at `x build` time to a `.html` file. Best for marketing pages, docs, blog posts, anything that doesn't need per-request data. No page in your app defaults to this; you must set it explicitly, or the build step will silently ship an empty/server-only route with no prerendered HTML.
- **`server`** (default): rendered per-request via `renderPage` / `renderStreamingPage` when running under `x start` (or `x dev`). Requires a live Bun server; **not deployable to static hosts** (see Deployment below).

## Loaders

Export a `loader` alongside your page to fetch data before render:

```ts
import type { RouteProps } from "@thexjs/core";

export async function loader({ params }: { params: Record<string, string> }) {
  return { user: await getUser(params.id) };
}

export default function UserPage({ loaderData }: RouteProps) {
  const { user } = loaderData as { user: { name: string } };
  return <p>{user.name}</p>;
}
```

`LoaderArgs` / `LoaderReturn` types are exported for typing loaders manually if needed.

## Server functions / actions

Files under an `actionsDir` register callable server functions. Each named export (or an `export const actions = { ... }` map) becomes a function callable from a client island:

```ts
// src/actions/contact.ts
export async function submitContact(data: { email: string; message: string }) {
  // runs on the server, callable from a client island
}

export const actions = {
  ping: async () => ({ pong: true }),
};
```

`registerServerFunctions`, `generateServerFunctionClient`, and `getServerFunctionHandler` are the lower-level primitives the router wires up automatically. Most apps won't call these directly.

## Islands (selective hydration)

Wrap any interactive piece of a static/server-rendered page in `<Island>` to ship it as a separately-hydrated client bundle:

```tsx
import { Island } from "@thexjs/core";

<Island name="LikeButton" client="visible">
  <LikeButton />
</Island>
```

`client` accepts `"idle" | "visible" | "load"`, controlling when the island hydrates on the client. Everything outside an `<Island>` stays static/server-rendered HTML with no client JS shipped.

## Content collections (Markdown)

Point `contentDir` at a folder of Markdown files with frontmatter; `scanContent` + `renderMarkdown` turn them into routable entries (e.g. for a blog):

```ts
import { scanContent, renderMarkdown } from "@thexjs/core";

const posts = scanContent("./src/content/blog");
const html = renderMarkdown(posts[0].body);
```

## Data layer

Thin, typed wrappers over Bun's built-in SQLite and Postgres clients, plus a minimal migration runner. Import from the `@thexjs/core/data` subpath:

```ts
import { connectSQLite, runSQLiteMigrations } from "@thexjs/core/data";

const db = connectSQLite({ path: "./data/dev.db" });
await runSQLiteMigrations(db, "./data/migrations");
```

```ts
import { connectPostgres, runPostgresMigrations } from "@thexjs/core/data";

const sql = connectPostgres({ url: process.env.DATABASE_URL! });
await runPostgresMigrations(sql, "./data/migrations");
```

## Middleware

```ts
// src/pages/dashboard/_middleware.ts
import type { MiddlewareContext, MiddlewareNext } from "@thexjs/core";

export async function middleware(ctx: MiddlewareContext, next: MiddlewareNext) {
  if (!ctx.request.headers.get("authorization")) {
    return new Response("Unauthorized", { status: 401 });
  }
  return next();
}
```

`composeMiddleware` chains multiple middleware functions together; `findMiddlewareChain` resolves which ones apply to a given route based on directory nesting.

## Building an app server yourself

Most apps just use `x dev` / `x build` / `x start` from `@thexjs/cli`. If you're embedding `x` in a custom entry point:

```ts
import { createApp, build } from "@thexjs/core";

// Dev / runtime server
const app = createApp({ pagesDir: "./src/pages", development: true });
Bun.serve(app);

// Static + server build
await build({ pagesDir: "./src/pages", outDir: "./.x" });
```

## Deployment note

`build()` writes prerendered `static` pages (and copies `public/`) to `<outDir>/client`; that output is a plain static site, deployable anywhere (Vercel, Netlify, any CDN). Any page left in the default `server` mode requires a running Bun process (`x start`) and **is not included in the static output**. It needs a Bun-capable host (Fly.io, a VPS, Docker, etc.), not a static host or a Node-only serverless platform.

## Enterprise readiness: security & observability

`createApp` accepts optional `security` and `observability` config, all on by sane defaults:

```ts
import { createApp, createSentryReporter } from "@thexjs/core";

const app = createApp({
  pagesDir: "./src/pages",
  actionsDir: "./src/actions",
  security: {
    // Origin/Referer verification on /__x/actions/* is always on; add explicit
    // cross-subdomain origins here, or requireToken for double-submit CSRF cookies.
    csrf: { allowedOrigins: ["https://app.example.com"] },
    // CSP, HSTS, X-Frame-Options, etc. Pass `false` to disable entirely, or
    // override individual fields (see SecurityHeadersOptions).
    headers: { contentSecurityPolicy: "default-src 'self'" },
    // In-memory fixed-window limiter, keyed by client IP by default.
    rateLimit: { limit: 100, windowMs: 60_000 },
  },
  observability: {
    // Structured JSON request logs (timestamp, requestId, route, status, durationMs). Default: true.
    logging: true,
    // Forward SSR/action/API exceptions to Sentry, OpenTelemetry, or both — see
    // createSentryReporter / createOtelReporter / combineReporters.
    errorReporter: createSentryReporter(Sentry),
    // /healthz (liveness) and /readyz (readiness) are always served, ahead of all
    // other routing. Add named checks (e.g. a DB ping) for /readyz.
    health: { checks: { database: () => db.ping() } },
  },
});
```

Only variables prefixed `THEXJS_PUBLIC_` may reach the browser. `@thexjs/env`'s `createEnv` defaults `clientPrefix` to that, and the build step throws an `EnvLeakageError` if any client bundle references a server-only `process.env`/`Bun.env`/`import.meta.env` variable, so a secret like `STRIPE_SECRET_KEY` can never round-trip into shipped JS.

## Exports reference

| Export | Purpose |
|---|---|
| `defineConfig`, `createApp`, `CreateAppOptions`, `RouteProps`, `RevalidateOptions` | App setup / dev & runtime server |
| `build`, `BuildOptions`, `RouteMode` | Static/server build step |
| `renderPage`, `renderStaticPage`, `renderStreamingPage`, `LoaderArgs`, `LoaderReturn` | Lower-level render functions |
| `scanRoutes`, `scanPages`, `scanApiDir`, `scanLayouts`, `scanLayoutsDir`, `scanMiddleware`, `scanNotFound`, `findLayoutChain`, `findMiddlewareChain`, `generateManifestSource`, `writeManifest` | Routing internals |
| `Island`, `IslandProvider`, `IslandMode`, `IslandEntry` | Selective hydration |
| `scanContent`, `renderMarkdown`, `escapeHtml`, `ContentEntry`, `Frontmatter` | Markdown content collections |
| `composeMiddleware`, `MiddlewareContext`, `MiddlewareFn`, `MiddlewareNext` | Middleware |
| `registerServerFunctions`, `generateServerFunctionClient`, `getServerFunctionHandler`, `resetServerFunctions` | Server functions/actions internals |
| `connectSQLite`, `connectPostgres`, `runSQLiteMigrations`, `runPostgresMigrations` | Data layer |
| `DefaultNotFound`, `renderErrorOverlay`, `CLIENT_NAV_SCRIPT` | Defaults / dev tooling |
| `checkCsrf`, `verifyOrigin`, `verifyCsrfToken`, `generateCsrfToken`, `withCsrfCookie`, `CsrfOptions`, `CsrfResult` | CSRF protection |
| `buildSecurityHeaders`, `applySecurityHeaders`, `SecurityHeadersOptions` | Security response headers (CSP/HSTS/etc.) |
| `createRateLimiter`, `rateLimitMiddleware`, `RateLimitOptions`, `RateLimitResult`, `RateLimitServer`, `createRedisRateLimitStore` | Rate limiting (per-IP fixed window) |
| `findLeakedEnvKeys`, `assertNoEnvLeakage`, `EnvLeakageError`, `PUBLIC_ENV_PREFIX` | Server/client env var isolation |
| `logger`, `withRequestLogging`, `Logger`, `LogFields` | Structured JSON logging |
| `setErrorReporter`, `getErrorReporter`, `reportException`, `createSentryReporter`, `createOtelReporter`, `combineReporters`, `noopReporter`, `ErrorReporter` | Error reporting (Sentry/OpenTelemetry hook) |
| `createHealthCheckHandler`, `HealthCheckOptions`, `HealthCheck`, `ReadinessResult` | `/healthz` and `/readyz` |

## License

MIT