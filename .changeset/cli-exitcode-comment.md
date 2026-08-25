---
"@thexjs/cli": patch
---

Document the intentional exit-code asymmetry: bare `x` exits 1 (usage error), `x --help` exits 0 (explicit request). Comment only, no behavior change.
