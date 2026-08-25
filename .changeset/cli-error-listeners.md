---
"@thexjs/cli": patch
---

`x start`: add an `error` event listener on the spawned `bun` process so that a missing `bun` on `PATH` prints a friendly installation message instead of a raw ENOENT stack trace.

`x dev`: add an `error` event listener on the Tailwind file watcher so that inotify exhaustion or directory removal logs a clear warning instead of silently dying.
