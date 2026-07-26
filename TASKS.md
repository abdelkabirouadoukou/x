# x — task list

Full-stack React framework. Astro on the front (static-first, content collections,
islands — ship near-zero JS by default), Next.js in the back (file-based API/server
routes, SSR, server functions), running on Bun instead of Node — no separate
bundler/dev-server stack, `Bun.serve()` + Bun's built-in bundler do that job natively.

## Progress so far

Working end to end, tested with `bun test`, typechecked, linted clean:
- File-based router (`packages/core/src/router.ts`) — static, `[param]`, and
  `[...catchall]` files converted to `Bun.serve()` route patterns
- Naive SSR (`packages/core/src/render.ts` + `createApp.ts`) — every route is
  always rendered server-side with `renderToString`, no static/server mode
  switch yet, no streaming yet
- `examples/basic` boots on Bun and serves both a static route and a
  `[id]` route with params flowing through correctly (verified with curl)

Everything below this point is still to do — checked items are done and
verified, not just written.

## Stack decisions (locked in for now)

- Runtime: Bun 1.3.x+ (HTML-import routing, native HMR, built-in SQLite/Postgres/
  MySQL/Redis clients — use these instead of adding ORMs/drivers early on)
- Language: TypeScript, strict mode, workspace-wide
- Rendering split: per-route explicit mode (`static` / `server`), never inferred
- Frontend default: static HTML + islands (hydrate only components that opt in)
- Backend: file-based routes mapped onto `Bun.serve()`'s `routes` object
  (static paths, `:param`, catch-all)
- Not writing a custom Rust/Zig compiler — Bun's transpiler/bundler is the
  compiler layer. Revisit only if a specific bottleneck proves it's needed.

---

## Phase 0 — Repo setup

- [x] Workspace monorepo (`packages/*`, `examples/*`)
- [x] `packages/core` — the framework runtime (router, renderer, server)
- [x] `packages/cli` — stub only, `x dev`/`x build`/`x start` not implemented
- [x] `examples/basic` — used to dogfood every feature as it's built
- [x] Shared `tsconfig.base.json`, strict mode on everywhere
- [x] Biome for lint + format
- [x] `bun test` wired up as the test runner
- [x] GitHub Actions: install, typecheck, lint, test on every PR
- [x] `README.md`
- [x] `LICENSE` (MIT)

## Phase 1 — File-based router

- [x] Route conventions: `src/routes/index.tsx`, `src/routes/[id].tsx`,
  `src/routes/[...slug].tsx`
- [x] Route scanner: walk `src/routes`, build an in-memory route tree
  (currently `node:fs` recursion — swap for `Bun.Glob` if it turns out cleaner)
- [x] Map route tree → `Bun.serve()`'s `routes` object (exact paths, `:param`,
  `*` catch-all) — covered by `router.test.ts`
- [x] Generate a typed route manifest (params typed per route, not just
  `Record<string, string>`)
  — `createApp` writes `src/x-routes.ts` in dev mode with a `RouteMap` type
    and a type-safe `href()` helper
- [x] Nested layouts: wrap a page in its ancestor `_layout.tsx` chain
  (`_` prefix is already reserved and skipped by the scanner, just unused)
  — `scanLayouts` discovers `_layout.tsx` files, `findLayoutChain` builds the
    ancestor chain for each route, and `createApp` wraps the page component
    from innermost to outermost layout
- [x] File watcher rebuilds the route tree on add/remove without a full
  server restart (`--hot` reloads changed route *content* today, not new
  route *files*)
  — `fs.watch` with `recursive: true` on the routes directory triggers a
    route-tree rebuild (debounced 200 ms) and logs added/removed routes

## Phase 2 — Static rendering + islands (the Astro half)

- [x] `export const mode = 'static'` on a route → prerendered at build time
  — `build()` reads the `mode` export; static routes are rendered with
    `renderToStaticMarkup` and written to `dist/client/`
- [x] Static build step: render each static route with `renderToStaticMarkup`,
  write to `dist/`
  — `packages/core/src/build.ts` includes `build()` that runs the full
    static-export pipeline
- [x] Content collections: `content/**/*.md(x)`, frontmatter parsing, each entry
  becomes a route (this is the blog/marketing use case)
  — `scanContent()` discovers markdown files, parses basic frontmatter,
    maps file paths to routes; served in dev mode via `contentDir` option,
    built to static HTML in `build()`
- [x] Island marker (`<Island client="idle">` or similar) — only marked components
  get a client JS bundle; everything else ships as plain HTML
  — `<Island>` component wraps children in `data-island` divs;
    `IslandProvider` collects island entries during render; build generates
    a stub JS chunk per island (real hydration module loading is next)
- [x] Verify Bun's bundler code-splits each island into its own small chunk
  — `bundleRouteIslands()` in `build.ts` generates a client entry per route
    that imports the route module and hydrates all `[data-island]` elements;
    runs `bun build` (via `Bun.spawn`) as a child process to produce a
    separate minified JS bundle per route's islands; bundle URL is injected
    into the page HTML via `<script type="module">` tags.
    Verified in `build.test.ts` — "island code-splitting" tests confirm
    separate JS chunks exist in `dist/client/_islands/`, HTML contains the
    script tag, and bundled output is valid JavaScript.

## Phase 3 — SSR + server functions (the Next.js half)

- [x] `export const mode = 'server'` — dynamically rendered server-side (Phase 2
  `static` mode exists alongside it)
- [x] `renderToReadableStream` streaming through the `Bun.serve` fetch handler —
  `renderStreamingPage()` in `render.ts`, server-mode routes stream HTML instead
  of blocking on full render
- [x] `loader()` convention: async function co-located with the route, runs
  server-side before render, data passed as `loaderData: Record<string, unknown>`
  in `RouteProps`
- [x] `src/routes/api/*.ts` → per-method handlers (`GET`/`POST`/`PATCH`/`DELETE`),
  scanned with `isApi` flag, dispatched by method
- [x] Typed server functions — any async named export from a route module is
  served as an RPC endpoint at `/__x/actions/<routePath>/<fnName>`;
  `generateServerFunctionClient()` produces typed fetch wrappers
- [x] Middleware: `_middleware.ts` files alongside routes, composed in onion
  pattern with `composeMiddleware()`, supports short-circuit
- [ ] Revalidation (ISR-equivalent) for pages that are mostly static but not quite

## Phase 4 — Dev server

- [ ] Confirm React Fast Refresh survives across island boundaries (n/a until
  islands exist)
- [ ] Server-side render errors surface in the browser overlay, not just
  client errors — right now an error in a route component just 500s

## Phase 5 — Production build

- [ ] `x build` → `bun build --target=bun` for the server bundle
- [ ] Fully-static routes get a separate static-export output
- [ ] `Dockerfile` using `oven/bun` base image
- [ ] Deployment notes for one real target (Fly.io or a plain VPS)

## Phase 6 — Data layer

- [ ] Thin helpers over Bun's built-in SQLite client for local dev
- [ ] Same helpers over Bun's Postgres client for anything meant to ship
- [ ] Pick one migration approach and write it down
- [ ] One auth/session example using the above

## Phase 7 — Prove the pitch

- [ ] Build one real app end to end: marketing/blog (static + content
  collections) plus a dashboard (SSR + server functions + auth) in the same
  project
- [ ] Benchmark against a plain Next.js app and a plain Astro app: cold dev
  server start, HMR round-trip, build time, Lighthouse score on the static
  page, TTFB on the SSR page

## Explicitly not doing yet

- Custom Rust/Zig compiler passes — Bun's own transpiler covers this
- Edge runtime adapter (Cloudflare Workers etc.) — different runtime
  constraints, separate project once the Bun-native version is proven
- Full React Server Components — islands + typed server functions cover most
  of the value with far less complexity; RSC is a v2 conversation
