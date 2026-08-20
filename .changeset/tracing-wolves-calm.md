---
"@thexjs/core": minor
---

OpenTelemetry tracing correlation (half of #79):

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