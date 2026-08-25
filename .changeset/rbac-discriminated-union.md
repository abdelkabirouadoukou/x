---
"@thexjs/auth": patch
---

Change `AuthGuardResult` from a flat `{ ok, status, reason }` interface to a discriminated union: `{ ok: true } | { ok: false; status: 401 | 403; reason: string }`. Guard success results no longer carry misleading `status`/`reason` fields. Existing consumers checking `result.ok` first (the only supported pattern) are unaffected; callers that access `.status` without narrowing will get a compile-time error.
