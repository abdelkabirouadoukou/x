---
"@thexjs/core": patch
"@thexjs/cli": patch
---

Contain process-level crashes and route them to the error reporter (closes #85):

- New `installProcessCrashHandlers()` helper (exported from `@thexjs/core`)
  registers `uncaughtException`/`unhandledRejection` handlers that log the
  crash and report it through the configured error reporter, so a throw
  outside the request lifecycle (module-eval error, rejected background
  promise) is surfaced instead of dying silently. The optional `exitOnCrash`
  flag opts into crash-on-error semantics for supervisor-managed deploys.
- The generated production server entry now installs these via the shared
  helper instead of inline code, and `x dev` installs identical handlers on the
  dev server — closing the gap where dev had no crash reporting at all.
- The top-of-fetch boundary (`guardFetchErrors`), the `Bun.serve` `error`
  hook, guarded revalidation JSON parsing and streaming-pump controller
  handling for #92 were already in place; this adds coverage proving a broken
  shared rate-limit store (e.g. Redis outage) surfaces as a 500 while the box
  keeps answering `/healthz`.
- Worker/subprocess isolation was evaluated and rejected for SSR: per-request
  workers would re-render the whole module graph and provide no isolation for
  shared state/DB; serverless deploys already provide that boundary. Left for
  the threat-model doc (#80).