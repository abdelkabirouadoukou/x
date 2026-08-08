---
"@thexjs/auth": patch
---

`getSession()` now fails closed when the session store is unavailable (e.g.
database down / connection lost): it logs a warning and returns `null` instead
of propagating the store error, so `/api/auth/session` and authenticated
requests respond as signed-out rather than crashing with a 500.
