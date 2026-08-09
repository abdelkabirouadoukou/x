---
"@thexjs/cli": minor
---

Add `x doctor`: a project diagnostics command that checks Bun version, config
presence/parse, expected directories (pages/api/actions/layouts/content/public),
route-tree compilation, installed `@thexjs/*` packages, and -- for production
envs -- server-only env access across pages/actions and a missing `AUTH_SECRET`.
Exits non-zero when problems are found.