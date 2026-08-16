---
"@thexjs/env": patch
---

`num()` now rejects empty/whitespace-only strings. Previously an empty numeric
env var (e.g. `PORT=`) silently parsed as `0`.