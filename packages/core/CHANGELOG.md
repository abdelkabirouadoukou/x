# @thexjs/core

## 1.6.1

### Patch Changes

- f537c1c: The Vercel adapter (`x build --adapter vercel`) now computes correct
  server-action names for batched action modules (`export const actions = { greet, farewell }`).
  
  Previously `fnNames` was derived from `Object.keys(actionMod)` alone, which yields
  `["actions"]` for the batched pattern — so the generated client stub exported a function
  literally named `actions` and a browser island doing `import { greet }` silently got
  `undefined`. The scanner now mirrors `createApp`/`build`: each key of a batched `actions`
  export is registered as a function, and individually-named function exports are included
  too. `ResolvedAction` gains an optional `fnNames` field carrying the client-visible names.

## 1.6.0

### Minor Changes

- 3637faf: Migration runners (`runSQLiteMigrations` / `runPostgresMigrations`) now
  record a sha256 checksum of each migration file in `_x_migrations.checksum`
  alongside the name, and detect drift when an already-applied file is edited:
  
  - `_x_migrations.checksum` is stored on apply and backfilled for existing
    deployments (`ADD COLUMN` via pragma probe on SQLite, `IF NOT EXISTS` on
    Postgres).
  
  - On re-run, applied files whose content no longer matches the stored
    checksum are reported in the new `result.drifted` array and logged with a
    warning by default. Pass `{ onDrift: "fail" }` to abort instead of
    continuing with a mismatched schema.
  
  - Migrations recorded before checksums existed show up in the new
    `result.unknownContent` array and are only warned on — never failed — so
    existing deployments keep booting quietly while being made aware of the
    unverifiable history.
  
  - Both result types gain `drifted` / `unknownContent` and now always include
    them (previously `drifted`/`unknownContent` did not exist).
- d3ecd41: Frontmatter is now parsed as real YAML via Bun's native parser instead of a
  hand-rolled line subset that silently dropped anything non-trivial.
  
  What changed:
  
  - Nested mappings (`seo:\n  title: ...`), block scalars (`|`, `>`), and
    `- item` sequence syntax parse correctly instead of losing data.
  - Scalar types are coerced per YAML 1.2 (`draft: true` → boolean,
    `priority: 10` → number, `price: null` → null). Previously everything stayed
    a string.
  - Malformed YAML and non-mapping top-level values (e.g. a bare sequence) now
    throw a build-time error naming the offending file instead of being silently
    discarded.
  - The closing `---` delimiter is now recognized only at the start of its own
    line, so a value like `title: a---b` no longer truncates the frontmatter.
  
  Behavioral notes: a value containing `: ` (colon + space) must now be quoted
  per YAML rules, and `key:` with no value yields `null` rather than `""`.

### Patch Changes

- 37820d5: Style-only: use template literals in the redaction module (no behavior change).

## 1.5.0

### Minor Changes

- 65806b5: OpenTelemetry tracing correlation (half of #79):
  
  - `@thexjs/core` never initializes OpenTelemetry itself — apps opt in by
    calling `setTracer(tracer)` (or `getTracer`) with any tracer whose
    `startSpan(name, { attributes })` matches the OTel surface. Without a
    configured tracer the layer degrades to synchronous no-ops.
  - Every request now opens an `x.http` root span carrying the `x.requestId`
    attribute plus route/method/status. With no inbound `x-request-id`, one is
    minted and shared via `traceRequestId()` so the log line, the response
    header and the trace span all agree.
  - Request-scoped phase spans cover the full pipeline, all correlated by
    `x.requestId`: `x.api` (API routes), `x.loader` (page loaders + SSR/SSG),
    `x.action` (server functions), `x.middleware` (the composed onion +
    handler), and `x.db` (both `connectSQLite` and `connectPostgres`, wrapping
    `query`/`run`/`execute`/template-tag calls). `x.db` spans record
    `db.system`, `db.operation` and a `db.statement` that is redacted and
    truncated: quoted string literals are collapsed to `?` placeholders and
    bearer/authorization-shaped values are masked, so constants never ride along
    in the trace. The `connectPostgres` template-tag path goes further — values
    are bound out-of-band so its recorded statements are placeholder-only by
    construction. Raw SQL passed to `unsafe()`/`bun:sqlite` is masked the same
    way.
  - Errors inside any span set the span to `ERROR` and record an exception.
    `runWithRequestSpan`, `tracePhase`, `tracePhaseSync` and `dbTraceAttributes`
    are exported for app-level advanced usage.
  - Mock-tracer tests cover a failing DB call carrying the request id, phase
    spans, error status propagation, and the full createApp request lifecycle.

## 1.4.0

### Minor Changes

- 32179eb: OpenTelemetry tracing correlation (half of #79):
  
  - `@thexjs/core` never initializes OpenTelemetry itself — apps opt in by
    calling `setTracer(tracer)` (or `getTracer`) with any tracer whose
    `startSpan(name, { attributes })` matches the OTel surface. Without a
    configured tracer the layer degrades to synchronous no-ops.
  - Every request now opens an `x.http` root span carrying the `x.requestId`
    attribute plus route/method/status. With no inbound `x-request-id`, one is
    minted and shared via `traceRequestId()` so the log line, the response
    header and the trace span all agree.
  - Request-scoped phase spans cover the full pipeline, all correlated by
    `x.requestId`: `x.api` (API routes), `x.loader` (page loaders + SSR/SSG),
    `x.action` (server functions), `x.middleware` (the composed onion +
    handler), and `x.db` (both `connectSQLite` and `connectPostgres`, wrapping
    `query`/`run`/`execute`/template-tag calls). `x.db` spans record
    `db.system`, `db.operation` and a `db.statement` that is redacted and
    truncated: quoted string literals are collapsed to `?` placeholders and
    bearer/authorization-shaped values are masked, so constants never ride along
    in the trace. The `connectPostgres` template-tag path goes further — values
    are bound out-of-band so its recorded statements are placeholder-only by
    construction. Raw SQL passed to `unsafe()`/`bun:sqlite` is masked the same
    way.
  - Errors inside any span set the span to `ERROR` and record an exception.
    `runWithRequestSpan`, `tracePhase`, `tracePhaseSync` and `dbTraceAttributes`
    are exported for app-level advanced usage.
  - Mock-tracer tests cover a failing DB call carrying the request id, phase
    spans, error status propagation, and the full createApp request lifecycle.

## 1.3.6

### Patch Changes

- d628d5e: Auth hardening (closes #75 and #112):
  
  - `defineAuth` now throws in production when no `secret` is configured,
    instead of silently generating a per-process random secret that invalidates
    every session on restart. Dev fallback uses `crypto.randomBytes`.
  - Session and OAuth state tokens are 256-bit CSPRNG hex (`randomBytes(32)`),
    replacing the `Math.random()`-derived suffix.
  - Credentials sign-in is protected by a per-account brute-force guard keyed on
    `(client IP, submitted identifier)` with exponential-backoff lockout
    (`loginBruteForce` option; default 5 attempts / 15-minute base window).
    Successful sign-in clears the bucket.
  - `SessionStore` gains `revokeAllForUser(userId)` (implemented for the SQLite
    and Postgres stores) and is exposed as `auth.revokeAllForUser` for "log out
    everywhere" and password-change flows.
  - OAuth2 authorization-code flow now uses PKCE (S256): the verifier is stored
    in its own `x_oauth_pkce` cookie at sign-in, the challenge is sent on the
    authorization URL, and the token exchange presents the matching verifier.
    A callback missing the verifier fails closed.
  - `forceSecureCookie` option forces the `Secure` flag on cookies outside
    production (e.g. behind a TLS-terminating proxy or HTTPS dev tunnel).
  - The core CSRF double-submit comparison is now constant-time (XOR over the
    token bytes) instead of `!==`, closing a timing side-channel (#112).
- 88902c4: feat: add audit logging for auth lifecycle and permission denials. `@thexjs/core` gains a pluggable `AuditSink` (`setAuditSink`, `createConsoleAuditSink`), the `audit` event emitter, and typed helpers (`auditLoginSuccess`, `auditLoginFailure`, `auditLogout`, `auditPasswordChanged`, `auditRoleChanged`, `auditPermissionDenied`, `auditSessionRevoked`). Reasons and metadata are scrubbed (sensitive keys and embedded credentials) before reaching the sink. `@thexjs/auth` now writes audit entries for sign-in success/failure, brute-force rate limiting, logout, session revocation, and RBAC permission denials; OAuth callback failures are reported instead of crashing, and also audited.
- 167bded: Harden the image proxy further (closes #114):
  
  - **Upstream byte cap** — new `maxBytes` option (default 10 MiB). A declared
    `Content-Length` over the cap is refused before streaming; a chunked body is
    wrapped in a counting stream that aborts (`UpstreamImageTooLargeError`) the
    instant the cap is crossed, stop reading the upstream, so an allow-listed
    host can't be used as a bandwidth-amplification vector.
  - **Private/reserved address guard** — an allow-listed hostname that is itself
    a private or reserved IP literal (`10.x`, `172.16/12`, `192.168/16`,
    `169.254.169.254`, loopback, link-local, CGNAT, doc/benchmark ranges, IPv6
    ULA/link-local/loopback/multicast/v4-mapped-or-NAT64) is refused with no DNS
    involved and no lookup race. `isPrivateOrReservedAddress` is exported for
    reuse.
  - **DNS-rebinding defense-in-depth** — allow-listed hostnames are resolved
    before connecting and every returned IP must be public. Default resolver is
    `Bun.dns.lookup` (RFC 2606 test names skipped; an NXDOMAIN/resolver error
    fails open — the fetch remains allow-list-bound). Override with the new
    `resolveHost` option. The check re-runs on every manual redirect hop, so a
    hop rebinding to a private target is refused before the fetch.
  
  Full v4/v6 + DNS/IP regression coverage in `proxy.test.ts`.
- 4361c32: Request body size limit (#109):
  
  - `createApp` gains a `maxBodySize` option (default 1 MiB), enforced ahead of
    route/action dispatch across every body-reading surface: `/api/*` routes,
    `/__x/actions/*` server functions, `/__x/revalidate`, and hydration-mismatch
    beacons.
  - Requests whose `Content-Length` exceeds the limit are rejected immediately
    with 413. Chunked requests without a `Content-Length` are wrapped in a
    counting stream that errors with `RequestBodyTooLargeError` (mapped to 413 by
    the dispatch paths) the moment the limit is crossed, aborting the body before
    it is fully buffered. Previously an attacker could POST an arbitrarily large
    body and drive the single Bun process toward OOM.
  - `enforceRequestBodySize` and `RequestBodyTooLargeError` are exported from
    `@thexjs/core`.
- 193cc6a: Log redaction (half of #79):
  
  - `@thexjs/core` now ships a redaction pass (`redact.ts`) applied inside the
    structured logger's `write()`: fields under sensitive key names (`password`,
    `token`, `secret`, `authorization`, `cookie`, `session`, `apiKey`, ...,
    case-insensitive substring match) are replaced with `[REDACTED]`, nested
    objects/arrays are walked recursively, and string values are scanned for
    embedded `Bearer`/`Basic` tokens and inline `Authorization:` values.
  - `withRequestLogging`'s catch block now redacts caught-error `.message`
    strings before emission, so a driver or app error that embeds a secret can
    never leak it into the log sink.
  - This is belt-and-suspenders beside the build-time env-leak scanner: that one
    protects client bundles, this one protects server logs, in dev and prod.
- 3234581: Contain process-level crashes and route them to the error reporter (closes #85):
  
  - New `installProcessCrashHandlers()` helper (exported from `@thexjs/core`)
    registers `uncaughtException`/`unhandledRejection` handlers that log the
    crash and report it through the configured error reporter, so a throw
    outside the request lifecycle (module-eval error, rejected background
    promise) is surfaced instead of dying silently. The optional `exitOnCrash`
    flag opts into crash-on-error semantics for supervisor-managed deploys.
  - The generated production server entry now installs these via the shared
    helper instead of inline code, and `x dev` installs identical handlers on the
    dev server — closing the gap where dev had no crash reporting at all.
  - The top-of-fetch boundary (`guardFetchErrors`), the `Bun.serve` `error`
    hook, guarded revalidation JSON parsing and streaming-pump controller
    handling for #92 were already in place; this adds coverage proving a broken
    shared rate-limit store (e.g. Redis outage) surfaces as a 500 while the box
    keeps answering `/healthz`.
  - Worker/subprocess isolation was evaluated and rejected for SSR: per-request
    workers would re-render the whole module graph and provide no isolation for
    shared state/DB; serverless deploys already provide that boundary. Left for
    the threat-model doc (#80).
- f1c55a0: Don't echo server-function error text to clients in production (closes #110):
  
  - In production, an action that throws now returns `Internal error (id: <opaque>)`
    with the same id in the `x-x-error-id` header, instead of the raw
    `err.message`. Driver errors that embed schema details, connection strings,
    or secrets never reach the client body.
  - The id is attached to the exception report context (`ErrorContext.errorId`),
    so server-side logs/APM carry the same correlation id the client can cite.
  - In dev (`NODE_ENV !== "production"`) the message is still echoed, preserving
    the familiar dev experience (full error text in the terminal and console).
  - Regression test: a Postgres-style `duplicate key ... "users_email_key"`
    message is proven absent from the production response body, and the opaque
    id is validated in both body and header. Pairs with #79 log redaction: the
    server stops echoing secrets to loggers *and* to clients.
- 8f9a8bf: Escape regex metacharacters in static route segments (closes #113):
  
  - `routePatternToRegex` now escapes `.`, `+`, `(`, `)`, `?`, `[`, `]`, `^`,
    `$`, `{`, `}`, `|`, `\` in literal segments before expanding `:param`/`*`
    tokens, so a folder named `v1.2` matches only `/v1.2` (previously the `.`
    matched any character and `/v1x2` also hit the route). Both page routing
    (`extractParams`) and server actions (`extractActionParams`) share this
    function, so both surfaces are fixed.
  - Regression tests for the full metacharacter set on the page-routing side and
    for `.`/`+` on the server-action side; dynamic `:param`/`*` tokens still
    capture as before.
- 7dee9e6: Emit a per-response CSP nonce instead of `script-src 'unsafe-inline'` (closes #111):
  
  - HTML responses (server-rendered, ISR, 404, content pages) now generate a
    128-bit random nonce per request, stamp it on every framework inline script
    (client navigation, live-reload, island hydration props), and build the
    default Content-Security-Policy with `script-src 'self' 'nonce-<value>'`
    instead of `'unsafe-inline'`.
  - The nonce travels on an internal `x-csp-nonce` response header so ISR cache
    hits reuse the exact value baked into the cached HTML; the header is
    stripped before the response reaches the client. Island bundles load by
    same-origin `src`, so `'self'` continues to authorize them.
  - Responses with no inline scripts (API JSON, images) keep the legacy default
    CSP — there is nothing inline to defend with a nonce.
  - A custom `security.headers.contentSecurityPolicy` is still applied verbatim
    and wins over the nonce.
  - Regression tests: nonce present and `'unsafe-inline'` absent from
    `script-src` on a default server-rendered page; the nonce matches the HTML
    tags; ISR miss→hit reuse the same nonce; unit tests for the header builder.

## 1.3.5

### Patch Changes

- a97bfbf: Deterministic SSR and observable hydration:
  
  - Pages now render exactly once. The two-pass "discovery" render (one throwaway
    pass to find islands, then the real pass for the HTML) is gone: `renderPageOnce`
    renders the tree a single time and resolves the island script list from the
    registry that same pass produced. Non-deterministic components (Math.random in
    `useState`, clock reads) can no longer diverge between passes, so markup and
    hydration scripts always describe the same render. Applies to server-mode
    streaming (via a lazy footer) and ISR/static computation; build-time static
    generation precomputes its script lists and is unaffected.
  - Hydration mismatches are no longer silently swallowed. Islands report a
    mismatch through `onRecoverableError` to a new `POST /__x/hydration-mismatch`
    endpoint (same-origin only, 1KB body cap), which forwards it to the error
    reporter as `phase: "ssr"`, `tag: "hydration-mismatch"` and increments an
    `x_http_hydration_mismatch` counter labeled by island, so rendering bugs stay
    observable in production.

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
