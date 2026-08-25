---
"@thexjs/core": patch
"@thexjs/auth": patch
---

Consolidate duplicated `X-Forwarded-For` / `x-real-ip` parsing into a single shared `clientIpFromRequest` helper in `packages/core/src/security/ip.ts`. The canonical implementation is exported from `@thexjs/core`; auth's brute-force guard now delegates to it instead of maintaining its own copy, so proxy-header fixes can't be applied to one call site and forgotten. Fixes #176.
