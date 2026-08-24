---
"@thexjs/cli": patch
---

Fix the `doctor` version-consistency check to evaluate real semver ranges instead of silently skipping `^`/`~` dependencies, which are what generated projects use.
