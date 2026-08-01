# Changelog

All notable changes to x are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
uses [Calendar Versioning](https://calver.org/) with `YYYY.MM.DD` release
dates. This is a pre-1.0 project — expect breaking changes between releases.

## Unreleased

### Security

- Hardened `assertNoEnvLeakage`: it now also flags `import.meta.env["KEY"]`,
  dynamic keys (`process.env[key]`), string-concatenated keys
  (`process.env["ST"+"RIPE"]`), and aliased `process.env` access.
- Added a Redis-backed rate-limit store (`createRedisRateLimitStore`) for
  multi-instance deployments, and rate-limiter buckets are now swept
  automatically instead of only on explicit `sweep()` calls.
- CSRF and session cookies are now sent with `Secure` when
  `NODE_ENV=production`.
- `connectPostgres` gained pool sizing (`max`), TLS enforcement (defaults to
  `require` in production), and optional CA certs.
- Removed the per-request `[x][security] applied N header(s)` log line that
  spammed stdout in production.

### Fixed

- **Docker build was broken**: the `Dockerfile`/`DEPLOY.md` referenced
  `dist/` while `x build` wrote `.x/`. The CLI now supports
  `x build --outDir <dir>` (and `x start --outDir <dir>`), and the Dockerfile
  builds with `--outDir dist`. The generated server entry is `index.ts`, not
  `index.js` — both docs and the image `CMD` were updated to match.
- **Dockerfile didn't copy all workspace `package.json` files**, so
  `bun install --frozen-lockfile` failed. It now copies every workspace's
  manifest before installing.
- `examples/basic` and `examples/saas` auth opened a new SQLite connection and
  re-ran migrations on **every** call. Both now use a module-level singleton
  connection and run migrations once (creating the `data/` dir if missing).
- The `saas` template login form was non-functional (no handler). It now
  submits to a real `POST` route with client-side feedback, matching the
  `basic` template.

### Docs

- Added `SECURITY.md`, `.env.example`, `CONTRIBUTING.md`, `CHANGELOG.md`, and
  `CODE_OF_CONDUCT.md`.
- Templates' demo auth (hardcoded `admin`/`admin`) is now explicitly marked
  DEMO ONLY in code and on the login pages.

### CI

- Pinned the Bun version (`1.3.14`) instead of `latest` for reproducible
  builds, added a Linux + macOS matrix, and a separate `bun audit` job.
- Added Dependabot configuration for weekly dependency updates.

## 0.1.x — pre-release

See the git history for changes before this changelog existed.
