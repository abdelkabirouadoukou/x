---
"@thexjs/core": minor
"@thexjs/adapter-vercel": patch
---

Extract the platform-agnostic adapter pipeline (build-manifest resolution,
per-file transpile, standalone render-function bundling, entry generation)
into `@thexjs/core/adapter` as a documented Adapter SDK. `@thexjs/adapter-vercel`
now composes the SDK (adding only its Node<->Web Request/Response bridge and
Build Output API v3 `.vercel/output` tree), so third-party adapters (Node,
Cloudflare, ...) reuse the same build core instead of reverse-engineering it.