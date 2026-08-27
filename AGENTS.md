# AGENTS.md x framework (Bun + React)

## What is this?

`x` is a full-stack React framework built natively on Bun. Monorepo with workspaces: `packages/*` (framework) and `examples/*` (dogfood apps).

## Quick commands

```bash
# Install + build all packages (postinstall runs automatically)
bun install

# Dev loop — builds packages then starts examples/basic
bun run dev

# Lint + format
bun run lint          # biome check .
bun run lint:fix      # biome check --write .

# Typecheck every package + example
bun run typecheck

# Run all tests
bun test
```

## Package layout

```
packages/core              framework runtime (router, SSR/SSG, islands, server functions, data layer)
packages/auth              credentials + OAuth2/GitHub auth, sessions, CSRF
packages/cli               `x dev` / `x build` / `x start` CLI
packages/env               type-safe env var validation
packages/hooks             client-side React hook helpers
packages/adapter-vercel      Vercel Build Output API adapter
packages/create-thexjs-app   `bun create thexjs-app@latest` scaffolder
packages/mcp                 MCP server exposing x's docs/conventions as tools for coding agents
examples/basic             full demo: pages, API routes, auth, dashboard
examples/default           minimal starter
examples/landing           x's own docs site
examples/blog              content collections demo
examples/saas              SaaS dashboard demo
```

## CLI usage

The CLI is `packages/cli/src/index.ts`. Run it directly with `bun`:

```bash
# From an example directory
bun ../../packages/cli/src/index.ts dev
bun ../../packages/cli/src/index.ts build
bun ../../packages/cli/src/index.ts start

# Or after postinstall links it globally
x dev
x build
x start

# x run dev  also works (alias)
# x build --adapter vercel  emits .vercel/output (requires @thexjs/adapter-vercel)
# x build --outDir dist  writes the build to ./dist (Dockerfile/DEPLOY.md use this)
# --cwd <dir>  run as if from another directory
```

## Build output

- `x build` writes to `.x/` (configurable via `--outDir` or `outDir`)
- `.x/client/` — static HTML, island JS chunks, public assets
- `.x/server/index.ts` — generated server entry (run with `x start` or `bun .x/server/index.ts`)
- `x start` runs the production server from `.x/server/`
- The generated server entry handles `SIGTERM`/`SIGINT` gracefully (stops
  accepting connections, flushes the error reporter, drains for 3s, exits)

## File-based routing conventions

Routes are scanned from `pagesDir` (default `src/pages`). The `_` prefix is reserved:

| File pattern | Behavior |
|---|---|
| `index.tsx` | Route `/` |
| `about.tsx` | Route `/about` |
| `[slug].tsx` | Dynamic segment, param in `loader({ params })` |
| `[...slug].tsx` | Catch-all, param is full remaining path |
| `_layout.tsx` | Nested layout for that directory |
| `_middleware.ts` | Middleware for that directory (onion pattern) |
| `_404.tsx` | Custom 404 page |
| `api/*.ts` | API route (if in `apiDir` or `pages/api/`) |

**API routes** export `GET`, `POST`, `PUT`, `PATCH`, `DELETE` handlers. Each receives the `Request` and returns a `Response`.

**Page routes** export a default React component. Optional exports:
- `export const mode = "static"` — prerender at build time (default: `"server"`)
- `export const revalidate = 3600` — ISR: cache for N seconds
- `export async function loader({ params, request })` — runs server-side, data passed as `loaderData`
- `export const middleware` — route-level middleware (alternative to `_middleware.ts`)

## Server functions

Files in `actionsDir` (default `src/actions`) export async functions. They are called via POST to `/__x/actions/<routePath>/<fnName>` with JSON args in the body. In dev, CSRF origin verification is enforced on `/__x/actions/*`.

## Auto-generated files

- `src/x-routes.ts` — written by `createApp` in dev mode. Contains a `RouteMap` type and a typed `href()` helper. **Do not edit.**
- `.x/server/index.ts` — written by `build()`. Re-imports `x.config.ts` at runtime to forward `security`/`observability` options (these can hold live values like error reporters).

## Config

`x.config.ts` at project root uses `defineConfig` from `@thexjs/core`. All options optional:

```ts
export default defineConfig({
  pagesDir: "src/pages",     // default
  layoutsDir: "src/layouts", // default
  apiDir: "src/api",         // default
  actionsDir: "src/actions", // default
  contentDir: "content",     // undefined
  port: 3000,                // default
});
```

## Content collections

Markdown files in `contentDir` are scanned at build/dev time. Frontmatter is parsed (basic YAML). Use `scanContent()` and `renderMarkdown()` in loaders. Each `.md`/`.mdx` file becomes a route at its path.

## Data layer

`@thexjs/core` exports `connectSQLite` (wraps `bun:sqlite` with WAL + FK), `connectPostgres` (wraps `Bun.sql`), `runSQLiteMigrations`, `runPostgresMigrations`. Migrations are tracked in a `_x_migrations` table.

## Testing

Tests use `bun:test`. Fixtures are created in `beforeAll` and cleaned up in `afterAll` under `__fixtures__/`. Run a single test file:

```bash
bun test packages/core/src/router.test.ts
```

## Code style

- **Biome** for lint + format (double quotes, 2-space indent, semicolons, trailing commas)
- **TypeScript strict** — `tsconfig.base.json` shared by all packages. Key flags: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`
- All packages use `"type": "module"`
- `verbatimModuleSyntax` means type-only imports must use `import type`

## Gotchas

- **Postinstall** builds all packages and links the CLI globally. If it fails, run `bun run build:packages` manually.
- **Dev server** auto-compiles Tailwind CSS if `src/styles/globals.css` exists (via `bunx tailwindcss`).
- **File watcher** rebuilds the route tree on `.tsx`/`.ts`/`.css` changes (debounced 200ms). Files starting with `_` or `.` are ignored.
- **Production server** reads `PORT` env var (default 3000).
- **Env isolation**: variables not prefixed with `THEXJS_PUBLIC_` (or custom prefix) are server-only. The build step (`security/env-isolation.ts`) fails if client code references non-prefixed env keys.
- **Security headers** are applied by default (CSP, HSTS, X-Frame-Options, etc.). Pass `security: { headers: false }` to disable.
- **Rate limiting** is enabled by default. Pass `security: { rateLimit: false }` to disable.

## Agent skills

### Issue tracker

Issues live as GitHub issues in this repo — use the `gh` CLI for all reads/writes. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root when present; proceed silently if absent. See `docs/agents/domain.md`.
