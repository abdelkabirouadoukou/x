---
"@thexjs/core": patch
---

Adds automated coverage for the dev-mode file watcher: `createApp-watcher.test.ts`
boots a real dev-mode app against a fixture project and asserts that adding a
route file rebuilds the route tree (serving the new route) and removing one
drops it again.
