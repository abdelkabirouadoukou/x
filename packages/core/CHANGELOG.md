# @thexjs/core

## 1.2.3

### Patch Changes

- c8e7985: Fix several correctness and security bugs found in the bug hunt:
  
  - **Image proxy**: blocked serving `image/svg+xml` (SVGs served from the app's
    own origin could execute scripts with origin privileges) and hardened
    redirects — automatic redirect-following was removed, each hop is now
    re-checked against the host allow-list, and the hop count is capped. Blocks
    an allow-listed origin redirecting to internal/metadata endpoints (SSRF).
  - **ISR**: the render cache was keyed by the route *pattern* (e.g.
    `/blog/[slug]`), so every dynamic URL on that pattern shared one cached page
    and leaked content across URLs. Cache entries are now keyed by the concrete
    URL, and the cache is checked before the loader runs so hits skip data
    fetching entirely.
  - **`/__x/revalidate`**: the unauthenticated cache-purge endpoint now runs the
    same CSRF/origin check as server actions, so a cross-site POST can no longer
    purge the ISR cache.
  - **Route ordering**: handlers are now sorted static-first so a literal route
    (e.g. `/posts/new`) isn't shadowed by a dynamic `/posts/[id]` depending on
    directory scan order.
  - **Dynamic-route params**: params extracted from the URL are now
    percent-decoded (`hello%20world` arrives as `hello world`).
  - **Migrations**: migration files are sorted numerically by leading prefix
    (`10_x.sql` no longer runs before `2_x.sql`).
  - **Postgres**: a connection probe that failed at boot used to be memoized as
    a permanently rejected promise, wedging the client even after the database
    recovered. The memo now resets on failure so the next query re-probes.

## 1.2.2

### Patch Changes

- c0ff88f: Make env-leak detection fail production builds loudly instead of silently
  degrading. A leaked server-only variable was previously caught by
  `assertNoEnvLeakage`, but the build continued and emitted a non-interactive
  fallback island while logging only a routine warning — a dead island in
  production that looked like a recovered build error. Now `x build` aborts
  with an `EnvLeakageError` (non-zero exit, visible to CI/CD), while the dev
  server keeps serving but logs a visually distinct `SECURITY` warning instead
  of a generic build error so it can't be mistaken for a hot-reload hiccup.

## 1.2.1

### Patch Changes

- baa688f: Fix a link-sanitization bypass in markdown rendering: control characters (tab, newline, carriage return) embedded in a link URL's scheme portion could evade scheme allowlisting while a browser strips them before parsing, turning a blocked link into a live `javascript:`-class link. URLs are now scrubbed of these characters before scheme detection and before being written into the emitted `href`.

  This shipped in 1.1.0 and is present through 1.2.0. Disclosure details are handled separately; this entry deliberately omits a working payload.

## 1.2.0

### Minor Changes

- fbd5e29: Extract the platform-agnostic adapter pipeline (build-manifest resolution,
  per-file transpile, standalone render-function bundling, entry generation)
  into `@thexjs/core/adapter` as a documented Adapter SDK. `@thexjs/adapter-vercel`
  now composes the SDK (adding only its Node<->Web Request/Response bridge and
  Build Output API v3 `.vercel/output` tree), so third-party adapters (Node,
  Cloudflare, ...) reuse the same build core instead of reverse-engineering it.

  `@thexjs/adapter-vercel` now requires `@thexjs/core@^1.2.0` (the release that
  introduces the `@thexjs/core/adapter` subpath) so consumers can never resolve
  the adapter against an older core that lacks the SDK export.

  Also hardened the generated Vercel entry: forwarded headers (`x-forwarded-proto`
  / `x-forwarded-host`) are validated instead of blindly trusted, streamed
  responses honor socket backpressure and cancel on client disconnect, the error
  path guards against already-sent headers, generated paths are project-relative,
  and non-JSON-serializable runtime options fail the build instead of silently
  dropping (keeping the deployed function aligned with `x start`).

- 58aa123: Add production-grade observability metrics: `createInMemoryMetrics()` (an in-process registry serving `/metrics` in Prometheus text format), `createOtlpMetricsReporter()` (forwards counters/histograms to an OpenTelemetry meter), and `withRequestMetrics()`. When passed as `observability.metrics` to `createApp`, every request records `x_http_requests_total`, `x_http_request_duration_ms`, and `x_http_errors_total` (plus `x_rate_limit_rejections_total`), and a `/metrics` endpoint is served ahead of routing when the reporter exposes one.

## 1.1.0

### Minor Changes

- d59c5b0: Refactored `createRedisRateLimitStore` so the Redis client connection is
  injectable, and exposed the building blocks for custom transports and tests:

  - `createRedisRateLimitStoreFromClient(clientFactory)` builds the shared
    rate-limit store from an explicit `RedisClientFactory`.
  - `RedisClientLike` / `RedisClientFactory` types are now exported.

  The default behavior is unchanged (lazy `bun:redis` connection, first-INCR
  sets the window TTL, failed connections are retried on the next call). The
  store's counting, window-expiry, and reconnect-on-failure behavior is now
  pinned by `packages/core/src/security/rate-limit-redis.test.ts`.

### Patch Changes

- e5cb7b4: Adds automated coverage for the dev-mode file watcher: `createApp-watcher.test.ts`
  boots a real dev-mode app against a fixture project and asserts that adding a
  route file rebuilds the route tree (serving the new route) and removing one
  drops it again.
- c2f1af9: Adds automated coverage for the Islands runtime: `island-bundle.test.tsx`
  hydrates a real island client bundle in a happy-dom DOM and asserts the SSR
  output survives hydration and that event handlers wired during hydration fire.
- c3761c0: Adds automated coverage for `connectPostgres` runtime behavior:
  `data/postgres.test.ts` pins the retry/backoff loop (exponential backoff,
  `onRetry` logging, error surfacing after the retry ceiling, `retryAttempts: 0`
  skip) and the TLS/`sslmode` mapping across environments.

## 1.0.0

### Major Changes

- b010e14: Release 1.0.0 of all packages.

## 0.1.7

### Patch Changes

- 72ca613: Add runtime test coverage for the request pipeline, server actions, image
  proxy, env validation, Vercel build output, and the CLI; add release
  automation (changesets + CI enforcement).
