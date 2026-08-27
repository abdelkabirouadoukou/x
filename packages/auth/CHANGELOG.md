# @thexjs/auth

## 3.0.10

### Patch Changes

- 05140e1: Thread the origin `Request` through `setSessionCookie(res, user, provider, req?)` and `revokeAllForUser(userId, req?)` so login-success and session-revoked audit entries capture the real origin IP + request-id instead of `null`. The optional third/fourth argument keeps programmatic/offline flows backward-compatible. Closes #169.
- c1e2c62: Close the TOCTOU race in the brute-force guard: `reserve()` now bumps an in-flight attempt counter synchronously before the async `authorize` call, so N parallel bad-password requests can no longer all pass the lockout check before any commits a failure. At most `maxAttempts` proceed to the provider; the rest get an immediate 429. Reservations are rolled back on success and converted to real failures on failure. Closes #168.
- Updated dependencies [a2f974c]
  - @thexjs/core@1.8.1

## 3.0.9

### Patch Changes

- d0b74a3: Add `configureTrustedProxy({ trustForwardedHeaders })` API to gate `X-Forwarded-For` / `X-Real-IP` header trust. Default is `false` (headers ignored), defeating IP-spoofing attacks against brute-force guards and audit trails. Adapters (e.g. Vercel) opt in explicitly. Validate inbound `x-request-id` against `/^[A-Za-z0-9_-]{1,128}$/` in `tracing.ts` and `audit.ts` — malformed values are replaced with a fresh UUID. Closes #167.
- Updated dependencies [13d5e42]
- Updated dependencies [a046ede]
- Updated dependencies [d0b74a3]
  - @thexjs/core@1.8.0

## 3.0.8

### Patch Changes

- d9da82e: Consolidate duplicated `X-Forwarded-For` / `x-real-ip` parsing into a single shared `clientIpFromRequest` helper in `packages/core/src/security/ip.ts`. The canonical implementation is exported from `@thexjs/core`; auth's brute-force guard now delegates to it instead of maintaining its own copy, so proxy-header fixes can't be applied to one call site and forgotten. Fixes #176.
- 3c105e7: Align the SQLite session store's upsert to match the Postgres store: `INSERT OR REPLACE` overwrites `created_at` on token conflict; the explicit `ON CONFLICT (token) DO UPDATE` form now leaves it untouched, matching Postgres's contract. Fixes #175.
- 198588b: Change `AuthGuardResult` from a flat `{ ok, status, reason }` interface to a discriminated union: `{ ok: true } | { ok: false; status: 401 | 403; reason: string }`. Guard success results no longer carry misleading `status`/`reason` fields. Existing consumers checking `result.ok` first (the only supported pattern) are unaffected; callers that access `.status` without narrowing will get a compile-time error.
- Updated dependencies [d9da82e]
  - @thexjs/core@1.7.1

## 3.0.7

### Patch Changes

- d628d5e: Auth hardening (closes #75 and #112):
  
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
- 88902c4: feat: add audit logging for auth lifecycle and permission denials. `@thexjs/core` gains a pluggable `AuditSink` (`setAuditSink`, `createConsoleAuditSink`), the `audit` event emitter, and typed helpers (`auditLoginSuccess`, `auditLoginFailure`, `auditLogout`, `auditPasswordChanged`, `auditRoleChanged`, `auditPermissionDenied`, `auditSessionRevoked`). Reasons and metadata are scrubbed (sensitive keys and embedded credentials) before reaching the sink. `@thexjs/auth` now writes audit entries for sign-in success/failure, brute-force rate limiting, logout, session revocation, and RBAC permission denials; OAuth callback failures are reported instead of crashing, and also audited.
- Updated dependencies [d628d5e]
- Updated dependencies [88902c4]
- Updated dependencies [167bded]
- Updated dependencies [4361c32]
- Updated dependencies [193cc6a]
- Updated dependencies [3234581]
- Updated dependencies [f1c55a0]
- Updated dependencies [8f9a8bf]
- Updated dependencies [7dee9e6]
  - @thexjs/core@1.3.6

## 3.0.6

### Patch Changes

- 8875aea: fix(publish): stop the `workspace:*` protocol from leaking into published tarballs
  
  `@thexjs/adapter-vercel@1.0.6` and `@thexjs/auth@3.0.5` were published with
  `"@thexjs/core": "workspace:*"` in their manifests. Bun publishes the
  `workspace:` range literally (it does not rewrite it like pnpm does), so
  consumers installing either package hit:
  
      Workspace dependency "@thexjs/core" not found
  
  Now the internal dependency is a real semver range (`^1.3.0`, matching how
  `@thexjs/cli` already declares it), so both packages install cleanly from
  npm. A repo-wide guard test (`scripts/workspace-protocol.test.ts`) plus a
  pre-publish check in the release workflow fail the build if a publishable
  manifest ever declares `workspace:` again.

## 3.0.5

### Patch Changes

- Updated dependencies [de14e71]
  - @thexjs/core@1.3.0

## 3.0.4

### Patch Changes

- b22e149: chore(deps-dev): bump @biomejs/biome from 1.9.4 to 2.5.8 and migrate config (formatting/lint fixes only)
- Updated dependencies [b22e149]
  - @thexjs/core@1.2.4

## 3.0.3

### Patch Changes

- c8e7985: Compare OAuth `state` and session tokens with a timing-safe digest comparison
  instead of a plain string equality check, so an attacker probing the state
  cookie can't distinguish byte-by-byte matches from mismatches via response
  timing.
- Updated dependencies [c8e7985]
  - @thexjs/core@1.2.3

## 3.0.2

### Patch Changes

- Updated dependencies [c0ff88f]
  - @thexjs/core@1.2.2

## 3.0.1

### Patch Changes

- Updated dependencies [baa688f]
  - @thexjs/core@1.2.1

## 3.0.0

### Minor Changes

- f22aaae: Add role-based access control. Sessions now carry `roles`/`permissions` (from the provider's user or a new `resolveRoles` hook on `defineAuth`, snapshotted at session creation). New pure helpers (`hasRole`, `hasAnyRole`, `hasPermission`, `hasAllPermissions`), fail-closed guards (`requireRole`, `requirePermission`, `requireAuth`), and middleware adapters (`toMiddleware`, plus `auth.requireRole(...)` / `auth.requirePermission(...)` / `auth.requireAuth()` / `auth.guard(...)`) that plug into the framework's route middleware. Signed out → 401, authenticated but unauthorized → 403, optional `redirectTo` for signed-out users.

### Patch Changes

- Updated dependencies [fbd5e29]
- Updated dependencies [58aa123]
  - @thexjs/core@1.2.0

## 2.0.0

### Patch Changes

- 79c4c3f: `getSession()` now fails closed when the session store is unavailable (e.g.
  database down / connection lost): it logs a warning and returns `null` instead
  of propagating the store error, so `/api/auth/session` and authenticated
  requests respond as signed-out rather than crashing with a 500.
- Updated dependencies [e5cb7b4]
- Updated dependencies [c2f1af9]
- Updated dependencies [c3761c0]
- Updated dependencies [d59c5b0]
  - @thexjs/core@1.1.0

## 1.1.0

### Minor Changes

- 990a083: New `@thexjs/auth` package: plug-and-play authentication for x apps.

  - `defineAuth()` with credentials (username/password) and OAuth2 providers,
    including a preconfigured GitHub preset.
  - Passwords hashed with Argon2 via `Bun.password` (`hashPassword` /
    `verifyPassword`).
  - Session stores on the framework data layer (`createSQLiteSessionStore`,
    `createPostgresSessionStore`); tokens are opaque, HMAC-SHA256 digests stored
    at rest, individually revocable, and expire after `sessionMaxAge`.
  - Single catch-all handler (`auth.handleRequest`) serving
    `/api/auth/signin/:id`, `/api/auth/callback/:id`, `/api/auth/signout`, and
    `/api/auth/session`, with automatic CSRF protection (`checkCsrf`) on auth
    POST endpoints and OAuth state-challenge verification on callbacks.
  - Server-side `getSession()` plus `setSessionCookie` / `clearSessionCookie`
    helpers.

  Credentials and OAuth callback flows, session expiry/revocation, and CSRF
  integration are covered by unit tests in `packages/auth/src/auth.test.ts`.
