# @thexjs/auth

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
