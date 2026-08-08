---
"@thexjs/core": patch
---

Adds automated coverage for `connectPostgres` runtime behavior:
`data/postgres.test.ts` pins the retry/backoff loop (exponential backoff,
`onRetry` logging, error surfacing after the retry ceiling, `retryAttempts: 0`
skip) and the TLS/`sslmode` mapping across environments.
