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
   `data/postgres.test.ts`), but the SQLite connection options are not.
2. **Content pipeline**: frontmatter parsing edge cases, content route
   generation, `.mdx` compile path.
3. **Observability reporters**: error reporter flush on shutdown, metric
   emission.

## Near-term (0.x)

- Close the data layer + content coverage gaps above.
- First `@thexjs/core` tagged release with a changelog via changesets.
- Broaden the Vercel adapter integration test to cover layouts + middleware
  chains and islands in the rendered output.

## Enterprise readiness (tracking)

What needs to hold before teams run this in production at scale. This is a
tracking list, not a commitment schedule — each item gets its own design first.

1. **Observability**: production-grade metrics. The framework currently emits
   health/readyz endpoints and an error-reporter hook; OTel/Prometheus metric
   emission (request counts, latency histograms, build/runtime errors) is not
   wired up.
2. **Authorization**: role-based access control / permissions layer. Sessions
   exist (`@thexjs/auth`), but there is no framework-level concept of roles,
   scopes, or per-route authorization guards.
3. **Scale validation**: load and concurrency testing. No published
   benchmarks or soak tests for SSR throughput, the rate limiter under load,
   or shared-store behavior across replicas.
4. **Release discipline**: first tagged release with strict semver + changelog
   via changesets for all `@thexjs/*` packages (currently pre-1.0, in flux).
5. **Backup / disaster recovery**: documented backup and restore story for the
   SQLite/Postgres data layer (hot backup via SQLite backup API, pg_dump/pg_restore,
   restore runbook + checklist) in `docs/data-layer`, plus runbook guidance for
   multi-instance deployments.
6. **Security response**: a security disclosure SLA. `SECURITY.md` documents
   reporting, but there is no committed response-time target or coordinated
   disclosure process yet.

## Post-1.0 considerations

- Node.js compatibility story (currently Bun-only by design).
- Streaming SSR and partial hydration.
- Middleware-first adapters beyond Vercel (Node, Cloudflare).

## Not planned

- CSS-in-JS runtime; styling stays compile-time (Tailwind via the dev server,
  plain CSS in `public/`).
- A plugin ecosystem; configuration is the extension point for now.
