---
"@thexjs/cli": patch
---

`x dev`: add an `error` event listener on the Tailwind file watcher so that inotify exhaustion or directory removal logs a clear warning instead of silently dying.
