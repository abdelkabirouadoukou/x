---
"@thexjs/core": minor
---

Refactored `createRedisRateLimitStore` so the Redis client connection is
injectable, and exposed the building blocks for custom transports and tests:

- `createRedisRateLimitStoreFromClient(clientFactory)` builds the shared
  rate-limit store from an explicit `RedisClientFactory`.
- `RedisClientLike` / `RedisClientFactory` types are now exported.

The default behavior is unchanged (lazy `bun:redis` connection, first-INCR
sets the window TTL, failed connections are retried on the next call). The
store's counting, window-expiry, and reconnect-on-failure behavior is now
pinned by `packages/core/src/security/rate-limit-redis.test.ts`.
