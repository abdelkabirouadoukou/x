---
"@thexjs/core": patch
---

Fail fast on uncaught exceptions in production servers: `exitOnCrash` now defaults to `true` for `uncaughtException` (which can leave process singletons half-mutated), while unhandled rejections stay survivable by default unless `exitOnUnhandledRejection` is set. The generated production entry now emits `installProcessCrashHandlers({ exitOnCrash: true })` so an escaped throw drains (`server.stop(true)`) and exits clean for the orchestrator to restart. Closes #160.
