---
"@thexjs/cli": patch
---

Pass `exitOnCrash: false` explicitly when the dev server installs its process crash handlers, so an uncaught exception outside the request lifecycle is reported through the error reporter instead of silently killing `x dev`. The prod generated entry continues to fail fast (`exitOnCrash: true`).