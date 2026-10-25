---
"@thexjs/core": minor
"@thexjs/cli": patch
---

Wire the existing bounded backpressure primitive into the public `createApp` / `defineConfig` surface, propagate the option through dev, production build/start, and adapter manifests, and document the per-process overload semantics. Saturated requests return 503 + `Retry-After`; queued client disconnects are removed without becoming false 500s.
