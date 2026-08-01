## Dev log

Newest first.

### 2026-08 — test-coverage pass: core pipeline + adapters + CLI

- **Coverage audit** — mapped all six packages: the previous 7 test files
  (1921 lines) lived entirely in `packages/core`; `@thexjs/env`, the Vercel
  adapter, and the CLI had **zero** tests. Recorded the gaps.
- **New suites (51 tests)**:
  - `createApp-request.test.ts` — full request pipeline: SSR, static mode,
    dynamic params, 404s, API dispatch + 405, security headers, rate-limit
    429, `/healthz`, stylesheet `<link>`.
  - `server-functions.test.ts` — action dispatch, route params, malformed
    body, thrown errors, and the CSRF origin checks.
  - `images/proxy.test.ts` — SSRF allow-list, protocol check, upstream
    errors, cache headers.
  - `packages/env/src/index.test.ts` — every validator + `createEnv` server /
    client prefix filtering and aggregate errors.
  - `packages/adapter-vercel/src/adapter.test.ts` — config.json routing,
    `static/` payload, render function bundle, and a **regression test** for
    the baked `stylesheetHref` (the 2026-07 Vercel styling bug).
  - `packages/cli/src/cli.test.ts` — real `x build` end-to-end on a fixture
    (`.x/` output, `--outDir`, adapter error handling). Added `react` as a
    CLI devDependency so the fixture resolves JSX.
- **Tooling** — added `@changesets/cli` + `bun changeset` script (config and
  release workflow already existed); documented the pre-1.0 semver policy and
  known limitations in the README; wrote `ROADMAP.md` (stability matrix +
  coverage debt).
- **Baseline** — 154 tests pass, 0 fail; lint + typecheck clean.

### 2026-08 — dependency audit clean + landing + Vercel styling

- **Dependency audit is clean with zero ignores** — the two previously-accepted
  advisories are fixed for real: root `overrides` force `esbuild` to `^0.28.1`
  and `@hono/node-server` to `^2.0.5` (via `@modelcontextprotocol/sdk@^1.30.0`,
  which supports it), and `shadcn` moved from `dependencies` to
  `devDependencies` in `examples/basic` (it's a dev-time scaffolder). Both
  `bun audit` and `bun audit --prod` now pass with no ignores; CI's
  `--ignore` flags and rationale comment removed.
- **Vercel styling bug fixed** — server-rendered pages deployed to Vercel were
  missing their stylesheet: `createApp` resolved the CSS `<link>` at runtime via
  `existsSync(public/styles.css)`, which always fails inside the serverless
  sandbox (static assets live in `.vercel/output/static`, not the function
  bundle). The resolved href is now baked at build time into the generated
  server entry (`stylesheetHref` option) by both `x build` and the Vercel
  adapter. Dev mode still falls back to the runtime probe.
- **Landing font swap** — replaced Fraunces/IBM Plex Mono with
  Space Grotesk (display) + Inter (body) + JetBrains Mono (code), all
  self-hosted woff2 under `public/files/` (no Google Fonts request, strict CSP
  `font-src 'self'`), removing the fontsource deps.
- **Boarding Pass `-6undefined` seat bug** — signed `>>` shifts on an unsigned
  seed produced negative indexes (`"ABCDEF"[-1]` → `undefined`) and negative
  boarding times; switched to `>>>`.
- **Lint/typecheck clean across the workspace** — fixed `noNonNullAssertion` ×2
  and `noForEach` in the landing `route-trail`, gave the boarding-pass barcode
  stable keys, and formatted everything.

### 2026-07 — production-readiness pass

- **`x build --outDir <dir>` / `x start --outDir <dir>`** — CLI now writes the
  build to an arbitrary directory instead of always `.x/`. Fixed the Docker
  image (`CMD bun dist/server/index.ts`) and `DEPLOY.md`, which referenced a
  `dist/` that never existed.
- **Graceful shutdown** — the generated production server entry and `x dev`
  handle `SIGTERM`/`SIGINT`: stop accepting connections, flush the error
  reporter, drain for 3s, exit.
- **Postgres** — `connectPostgres` now pools (`max`), enforces TLS by default
  in production (`ssl: "require"`, with optional `ca`), and retries the first
  connection with exponential backoff (`retryAttempts`, `retryDelayMs`).
- **Rate limiting** — async `check`/middleware, automatic bucket sweeping,
  and a `createRedisRateLimitStore` for cluster-wide limiting (uses built-in
  `bun:redis`, no npm dependency).
- **Env isolation hardened** — the client-bundle scan now also catches
  `import.meta.env["KEY"]`, dynamic keys, concatenated keys, and aliased
  `process.env`.
- **Cookies** — CSRF and session cookies get `Secure` in production.
- **Auth singletons** — template `auth.ts` files open one SQLite connection
  and run migrations once instead of per call.
- **saas template login** — now functional (submits to a real API route) and
  marked DEMO ONLY, matching the basic template.
- **Docs** — added `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`,
  `CODE_OF_CONDUCT.md`, `.env.example`.
- **CI** — pinned Bun 1.3.14, Linux + macOS matrix, dependency audit job
  (full graph + a separate production-graph audit with no ignores).