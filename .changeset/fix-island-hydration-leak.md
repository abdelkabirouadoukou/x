---
"@thexjs/core": patch
---

Fix critical memory leak where client-side navigation orphaned hydrated islands without calling `.unmount()`, causing leaked event listeners, timers, and fiber trees. Islands now register their React roots in `window.__xIslandRoots`, and `navigate()` unmounts all outgoing roots before swapping `innerHTML`. Closes #158, Closes #155.
