# @thexjs/core

## 1.3.4

### Patch Changes

- c9f5810: Streaming SSR responses now respect backpressure and honor client disconnect:
  
  - The SSR stream pump is pull-driven: it only reads from React's stream while
    the HTTP sink has room, so a slow consumer throttles the render instead of
    buffering unbounded chunks in memory.
  - Calling `cancel()` on the response stream (client disconnect) cancels the
    underlying React reader, stopping the render instead of wasting CPU, with no
    escaping rejection.
  - A render error that surfaces mid-stream now reports via a new
    `onRenderError` hook (wired in `createApp` to the error reporter +
    `x_http_errors_total` metric) instead of silently shipping a partial page.

## 1.3.3

### Patch Changes

- 97d0f39: Add a global error boundary on the Bun serve path: createApp now exposes an `error` hook and guards the top of the fetch handler, so a thrown loader/API/handler error returns a clean 500 instead of taking down the process. Revalidation JSON body parsing is guarded (400 on malformed JSON), the streaming SSR pump tolerates a closed/aborted controller, and the generated production entry routes `uncaughtException`/`unhandledRejection` through the error reporter. Also closes a double-percent-encoding gap in the markdown link sanitizer: `isSafeLinkUrl` now decodes repeatedly (bounded) so double- and triple-encoded `javascript:` URLs are rejected like every other bypass.
- 1a6524f: Make request/rebuild state truly request-scoped and prove it under load:
  
  - Island ids are generated from each request's own registry (`createIslandRegistry` now carries the id counter), so ids restart per request instead of growing forever on a shared module-level counter.
  - `getServerFunctionHandler` iterates an immutable snapshot of the action registry, so a concurrent dev rebuild can no longer hand an in-flight request a half-populated `ACTION_ROUTES` array.
  - New `concurrency.test.ts`: N parallel requests with distinct identities assert zero cross-request leakage of loader data, headers, and island ids.
  - Documented the per-request state contract in the data-layer docs (no shared mutable module state; `AsyncLocalStorage` for cross-write request context).
- 254f29b: Make the ISR cache key-safe, bounded, and stampede-proof:
  
  - Cache keys are now the full URL (pathname + query string), so `/search?q=alpha` and `/search?q=beta` on the same ISR route never serve each other's HTML.
  - Cache is an `IsrCache` with a 500-entry LRU cap instead of an unbounded `Map`, evicting least-recently-used entries first.
  - Concurrent misses for the same URL share one in-flight render (`getOrCompute`), so a stampede rebuilds the entry exactly once.
  - Revalidate-by-path plumbs the new key scheme: it purges every query variant under a pathname, and a Response from a loader (e.g. redirect) is passed through without being cached.

## 1.3.2

### Patch Changes

- e4ad9ee: fix(adapter): emit server-mode islands to disk and wire them into the render function
  
  Server-mode pages (e.g. a home page using the GitHub loader) never shipped
  their client islands in production: `bundleRouteIslands()` built bundles in
  memory only, `adapter/scan.ts` precomputed resolved routes/actions before
  island discovery ran, and `adapter-vercel` hardcoded `islandScripts: []`. The
  resulting production HTML referenced `/_islands/...` script files that were
  absent from Vercel's output, so `client="load"` islands (scroll-spy, analytics,
  hero scroll cue) never hydrated.
  
  Now `bundleRouteIslandsToDisk()` writes the shared island bundle (and its
  module dependency graph) under the adapter's `islandsDir`, the adapter resolves
  them into the route's `islandScripts`, `generate-entry` emits them into the
  render function, and adapter-vercel passes `islandsDir: <dir>/client` so the
  bundles land in `static/_islands/...` and are served by the CDN.

## 1.3.1

### Patch Changes

- e4ad9ee: fix(adapter): emit server-mode islands to disk and wire them into the render function
  
  Server-mode pages (e.g. a home page using the GitHub loader) never shipped
  their client islands in production: `bundleRouteIslands()` built bundles in
  memory only, `adapter/scan.ts` precomputed resolved routes/actions before
  island discovery ran, and `adapter-vercel` hardcoded `islandScripts: []`. The
  resulting production HTML referenced `/_islands/...` script files that were
  absent from Vercel's output, so `client="load"` islands (scroll-spy, analytics,
  hero scroll cue) never hydrated.
  
  Now `bundleRouteIslandsToDisk()` writes the shared island bundle (and its
  module dependency graph) under the adapter's `islandsDir`, the adapter resolves
  them into the route's `islandScripts`, `generate-entry` emits them into the
  render function, and adapter-vercel passes `islandsDir: <dir>/client` so the
  bundles land in `static/_islands/...` and are served by the CDN.

## 1.3.0

### Minor Changes

- de14e71: feat(image): ship a next/image-equivalent `<Image>` component and accept width/quality hints in the image proxy
  
  - New `Image` component (`packages/core/src/image.tsx`, exported from `@thexjs/core`):
    responsive `srcset`/`sizes` through the allow-listed `/_x/image` proxy,
    `priority` (skips lazy, sets fetchpriority=high), `fill` mode,
    `placeholder="blur"` via `blurDataURL`, required `alt`, automatic remote-src
    rewriting, and dev-only warnings.
  - `createImageProxyHandler` now validates-and-ignores optional `w` (width) and
    `q` (quality) query params so the component API is stable ahead of the
    resize/transcode pipeline. SSRF allow-list and redirect protections are
    unchanged.
  - `examples/basic` swaps its local `<Image>` wrapper for a thin re-export of
    the framework component and documents `images.remoteHosts` in `x.config.ts`.

## 1.2.4

### Patch Changes

- b22e149: chore(deps-dev): bump @biomejs/biome from 1.9.4 to 2.5.8 and migrate config (formatting/lint fixes only)

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
