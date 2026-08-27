---
"@thexjs/auth": patch
---

Fix a permanent brute-force lockout: `provider.authorize()` is now wrapped in try/finally in `handleCredentialsSignIn`, so the in-flight reservations for both the account and IP buckets are released no matter how `authorize` exits (resolve, return falsy, or throw). Previously a throwing provider leaked its reservation, and since the `inflight` counter has no expiry, the account/IP became permanently locked at `maxAttempts` for the lifetime of the process. A caught throw now returns 500 without counting as a fake brute-force failure; a later healthy attempt can still succeed.
