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
| Security headers / rate limiting | stable | yes | `security/security.test.ts`, `createApp-request.test.ts` |
| Image proxy (SSRF allow-list) | stable | yes | `images/proxy.test.ts` |
| Env validation (`@thexjs/env`) | stable | yes | `packages/env/src/index.test.ts` |
| Build toolchain (`x build`, `.x/` output) | stable | yes | `build.test.ts`, `cli.test.ts` |
| Vercel adapter (output v3, config.json) | stable | yes | `adapter.test.ts` |
| Layouts / middleware chains | stable | partial | scanning tested; multi-layer rendering less so |
| Content collections (`scanContent`) | beta | yes | `content.test.ts`; frontmatter parser is a small custom YAML subset |
| Data layer (SQLite/Postgres migrations) | beta | no | thin wrapper over `bun:sqlite` / `Bun.sql`; migration runner untested |
| Islands / client hydration | beta | partial | build emits islands; runtime hydration tested via examples only |
| Content-MDX | experimental | no | `.mdx` support exists but is the least exercised surface |
| Observability (health/readyz, metrics) | beta | partial | health checked in `createApp-request.test.ts`; reporter flushing untested |

## Coverage debt (high → low priority)

1. **Data layer** — migration runner, WAL/FK setup, retry/backoff behavior.
   Users depend on this for real apps; today it's untested glue around Bun's
   drivers.
2. **Content pipeline** — frontmatter parsing edge cases, content route
   generation, `.mdx` compile path.
3. **Islands runtime** — hydration lifecycle, island props serialization,
   event wiring.
4. **Observability reporters** — error reporter flush on shutdown, metric
   emission.
5. **CLI `dev`** — dev-mode file watching / route rebuild (exercised manually,
   not automated).

## Near-term (0.x)

- Close the data layer + content coverage gaps above.
- First `@thexjs/core` tagged release with a changelog via changesets.
- Broaden the Vercel adapter integration test to cover layouts + middleware
  chains and islands in the rendered output.

## Post-1.0 considerations

- Node.js compatibility story (currently Bun-only by design).
- Streaming SSR and partial hydration.
- Middleware-first adapters beyond Vercel (Node, Cloudflare).

## Not planned

- CSS-in-JS runtime; styling stays compile-time (Tailwind via the dev server,
  plain CSS in `public/`).
- A plugin ecosystem; configuration is the extension point for now.
