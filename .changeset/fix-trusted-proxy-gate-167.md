---
"@thexjs/core": minor
"@thexjs/auth": patch
"@thexjs/adapter-vercel": patch
---

Add `configureTrustedProxy({ trustForwardedHeaders })` API to gate `X-Forwarded-For` / `X-Real-IP` header trust. Default is `false` (headers ignored), defeating IP-spoofing attacks against brute-force guards and audit trails. Adapters (e.g. Vercel) opt in explicitly. Validate inbound `x-request-id` against `/^[A-Za-z0-9_-]{1,128}$/` in `tracing.ts` and `audit.ts` — malformed values are replaced with a fresh UUID. Closes #167.
