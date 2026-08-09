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

`@thexjs/adapter-vercel` now requires `@thexjs/core@^1.2.0` (the release that
introduces the `@thexjs/core/adapter` subpath) so consumers can never resolve
the adapter against an older core that lacks the SDK export.

Also hardened the generated Vercel entry: forwarded headers (`x-forwarded-proto`
/ `x-forwarded-host`) are validated instead of blindly trusted, streamed
responses honor socket backpressure and cancel on client disconnect, the error
path guards against already-sent headers, generated paths are project-relative,
and non-JSON-serializable runtime options fail the build instead of silently
dropping (keeping the deployed function aligned with `x start`).