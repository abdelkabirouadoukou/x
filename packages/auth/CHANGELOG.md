# @thexjs/auth

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
