---
"@thexjs/core": patch
---

Make request/rebuild state truly request-scoped and prove it under load:

- Island ids are generated from each request's own registry (`createIslandRegistry` now carries the id counter), so ids restart per request instead of growing forever on a shared module-level counter.
- `getServerFunctionHandler` iterates an immutable snapshot of the action registry, so a concurrent dev rebuild can no longer hand an in-flight request a half-populated `ACTION_ROUTES` array.
- New `concurrency.test.ts`: N parallel requests with distinct identities assert zero cross-request leakage of loader data, headers, and island ids.
- Documented the per-request state contract in the data-layer docs (no shared mutable module state; `AsyncLocalStorage` for cross-write request context).