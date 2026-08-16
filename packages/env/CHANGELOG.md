# @thexjs/env

## 1.0.1

### Patch Changes

- c8e7985: `num()` now rejects empty/whitespace-only strings. Previously an empty numeric
  env var (e.g. `PORT=`) silently parsed as `0`.

## 1.0.0

### Major Changes

- b010e14: Release 1.0.0 of all packages.

## 0.1.5

### Patch Changes

- 72ca613: Add runtime test coverage for the request pipeline, server actions, image
  proxy, env validation, Vercel build output, and the CLI; add release
  automation (changesets + CI enforcement).
