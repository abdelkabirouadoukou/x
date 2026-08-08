# @thexjs/core

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
