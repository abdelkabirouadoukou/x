---
"@thexjs/auth": patch
---

Close the TOCTOU race in the brute-force guard: `reserve()` now bumps an in-flight attempt counter synchronously before the async `authorize` call, so N parallel bad-password requests can no longer all pass the lockout check before any commits a failure. At most `maxAttempts` proceed to the provider; the rest get an immediate 429. Reservations are rolled back on success and converted to real failures on failure. Closes #168.
