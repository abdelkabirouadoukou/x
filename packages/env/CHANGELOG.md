# @thexjs/env

## 1.1.0

### Minor Changes

- e795002: Add `optional()` and `default()` combinators to every built-in env validator:
  
  - `num().optional()` → `number | undefined`, missing variable no longer fails
    validation; a present but invalid value still throws
  - `num().default(3000)` → `number`, missing variable yields the fallback; a
    present but invalid value still throws
  - Combinators chain, e.g. `oneOf(["dev", "prod"] as const).default("dev")`
  
  Missing optional vars now pass through `createEnv` instead of failing the
  whole validation, so legitimately-optional variables (feature flags,
  `SENTRY_DSN`, …) no longer need empty placeholder values.

## 1.0.2

### Patch Changes

- b22e149: chore(deps-dev): bump @biomejs/biome from 1.9.4 to 2.5.8 and migrate config (formatting/lint fixes only)

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
