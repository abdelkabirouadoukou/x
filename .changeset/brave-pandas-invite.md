---
"@thexjs/auth": patch
"@thexjs/core": patch
---

Auth hardening (closes #75 and #112):

- `defineAuth` now throws in production when no `secret` is configured,
  instead of silently generating a per-process random secret that invalidates
  every session on restart. Dev fallback uses `crypto.randomBytes`.
- Session and OAuth state tokens are 256-bit CSPRNG hex (`randomBytes(32)`),
  replacing the `Math.random()`-derived suffix.
- Credentials sign-in is protected by a per-account brute-force guard keyed on
  `(client IP, submitted identifier)` with exponential-backoff lockout
  (`loginBruteForce` option; default 5 attempts / 15-minute base window).
  Successful sign-in clears the bucket.
- `SessionStore` gains `revokeAllForUser(userId)` (implemented for the SQLite
  and Postgres stores) and is exposed as `auth.revokeAllForUser` for "log out
  everywhere" and password-change flows.
- OAuth2 authorization-code flow now uses PKCE (S256): the verifier is stored
  in its own `x_oauth_pkce` cookie at sign-in, the challenge is sent on the
  authorization URL, and the token exchange presents the matching verifier.
  A callback missing the verifier fails closed.
- `forceSecureCookie` option forces the `Secure` flag on cookies outside
  production (e.g. behind a TLS-terminating proxy or HTTPS dev tunnel).
- The core CSRF double-submit comparison is now constant-time (XOR over the
  token bytes) instead of `!==`, closing a timing side-channel (#112).
