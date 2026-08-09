# Roadmap

Direction and coverage status for the x framework. Newest signal first; this
file is the honest scoreboard, not a marketing plan.

## API stability matrix

What you can rely on vs. what can still move. "Tested" means the behavior is
pinned by an automated test in `packages/*/src/*.test.ts` at the time of
writing.

| Area | Status | Tested | Notes |
|---|---|---|---|
| File-based routing (scan, params, 404) | stable | yes | `router.test.ts`, `createApp-request.test.ts` |
| SSR / static rendering (`mode`) | stable | yes | `phase3.test.ts`, `createApp-request.test.ts` |
| API routes (method dispatch, 405) | stable | yes | `createApp-request.test.ts` |
| Server functions (dispatch, CSRF) | stable | yes | `server-functions.test.ts` |
| Security headers / rate limiting | stable | yes | `security/security.test.ts`, `security/rate-limit-redis.test.ts` |
| Env-leak guard (server-only env in client code) | stable | yes | `env-leak.test.ts` (prod fails loudly; dev stub + 🔒 warning) |
| Image proxy (SSRF allow-list) | stable | yes | `images/proxy.test.ts` |
| Env validation (`@thexjs/env`) | stable | yes | `packages/env/src/index.test.ts` |
| Build toolchain (`x build`, `.x/` output) | stable | yes | `build.test.ts`, `cli.test.ts` |
| Dev server (file watching, route rebuild) | beta | yes | `createApp-watcher.test.ts` |
| Vercel adapter (output v3, config.json) | stable | yes | `adapter.test.ts` |
| Layouts / middleware chains | stable | partial | scanning tested; multi-layer rendering less so |
| Content collections (`scanContent`) | beta | yes | `content.test.ts`; frontmatter parser is a small custom YAML subset |
| Data layer (SQLite/Postgres migrations) | beta | yes | `data/migrate.test.ts`; retry/backoff + TLS pinned by `data/postgres.test.ts` |
| Auth (`@thexjs/auth`) | stable | yes | `auth.test.ts` + `auth-failures.test.ts` (store outage, store swap, generic OAuth2) |
| Islands / client hydration | beta | yes | build emits islands; runtime hydration pinned by `island-bundle.test.ts` (mount, SSR round-trip, event wiring) |
| Content-MDX | experimental | no | `.mdx` support exists but is the least exercised surface |
| Observability (health/readyz, metrics) | beta | partial | health checked in `createApp-request.test.ts`; reporter flushing untested |

## Coverage debt (high → low priority)

1. **Data layer**: SQLite WAL/FK setup. The migration runner and Postgres
   retry/backoff + TLS behaviors are tested (`data/migrate.test.ts`,
   `data/postgres.test.ts`). SQLite connection options (WAL journaling,
   foreign keys, and their opt-outs) are now pinned by
   `data/sqlite.test.ts` — including that FK enforcement actually rejects
   orphan inserts and is genuinely lifted when disabled.
2. **Content pipeline**: frontmatter parsing edge cases, content route
   generation, `.mdx` compile path.
3. **Observability reporters**: error reporter flush on shutdown, metric
   emission.

## Near-term (0.x)

- Close the data layer + content coverage gaps above.
- First `@thexjs/core` tagged release with a changelog via changesets.
- Broaden the Vercel adapter integration test to cover layouts + middleware
  chains and islands in the rendered output.

## Enterprise readiness

What needs to hold before teams run this in production at scale. This is a
tracking list, not a commitment schedule — each item gets its own design first.
Shipped items are listed with a pointer to where they landed.

### Shipped

- **Release discipline** — first tagged release (`1.0.0` baseline across all
  `@thexjs/*` packages) shipped via the changesets flow; versioning policy in
  `VERSIONING.md`, operations in `CONTRIBUTING.md#releasing`.
- **Adapter ecosystem** — `@thexjs/core` ships a platform-agnostic Adapter SDK
  (`@thexjs/core/adapter`): build-manifest resolution, per-file transpile, and
  render-function bundling are reusable, so third-party adapters only implement
  their platform's output layer. `@thexjs/adapter-vercel` is the reference
  implementation.

### Tracking (remaining)

1. **Observability**: production-grade metrics. `createInMemoryMetrics()`
   (Prometheus text `/metrics`) + `createOtlpMetricsReporter()` wired into
   `createApp` via `observability.metrics` — request counts, latency histograms,
   error and rate-limit-rejection counters. Shipped; keep tracking until
   reporter flush on shutdown is exercised end-to-end in a test.
2. **Authorization**: role-based access control / permissions layer. Sessions
   carry roles/permissions (via `resolveRoles`), and `requireRole`/
   `requirePermission`/`requireAuth` guards plug into route middleware.
   Shipped in `@thexjs/auth`; keep tracking until an example app exercises a
   full roles + scopes flow end-to-end.
3. **Scale validation**: load and concurrency testing. Load harness at
   `scripts/bench/load.ts` (SSR throughput + percentiles, server-fn
   throughput, rate-limiter burst) with methodology in `BENCHMARKS.md` and a
   non-blocking CI job. Baseline ~3,000 RPS SSR / ~3,800 RPS server-fn on
   Apple Silicon. Keep tracking until a shared-store (Redis) multi-replica
   soak test is added.
4. **Backup / disaster recovery**: documented backup and restore story for the
   SQLite/Postgres data layer (hot backup via SQLite backup API, pg_dump/pg_restore,
   restore runbook + checklist) in `docs/data-layer`, plus runbook guidance for
   multi-instance deployments.
5. **Security response**: disclosure SLA in `SECURITY.md` — 48h acknowledgement,
   5-business-day triage, CVSS-aligned severity, 90-day coordinated disclosure,
   and a 12-month backport window for the previous major. Shipped; kept in the
   tracking list until the disclosure flow has been exercised once end-to-end.

## Post-1.0 considerations

- Node.js compatibility story (currently Bun-only by design).
- Streaming SSR and partial hydration.
- Middleware-first adapters beyond Vercel (Node, Cloudflare).

## Not planned

- CSS-in-JS runtime; styling stays compile-time (Tailwind via the dev server,
  plain CSS in `public/`).
- A plugin ecosystem; configuration is the extension point for now.
