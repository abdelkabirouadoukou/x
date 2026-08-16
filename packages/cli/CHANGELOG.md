# @thexjs/cli

## 1.1.1

### Patch Changes

- b22e149: chore(deps-dev): bump @biomejs/biome from 1.9.4 to 2.5.8 and migrate config (formatting/lint fixes only)
- Updated dependencies [b22e149]
  - @thexjs/core@1.2.4
  - @thexjs/adapter-vercel@1.0.5

## 1.1.0

### Minor Changes

- 43fa19d: Add `x doctor`: a project diagnostics command that checks Bun version, config
  presence/parse, expected directories (pages/api/actions/layouts/content/public),
  route-tree compilation, installed `@thexjs/*` packages, and -- for production
  envs -- server-only env access across pages/actions and a missing `AUTH_SECRET`.
  Exits non-zero when problems are found.

### Patch Changes

- Updated dependencies [fbd5e29]
- Updated dependencies [58aa123]
  - @thexjs/core@1.2.0
  - @thexjs/adapter-vercel@1.0.1

## 1.0.0

### Major Changes

- b010e14: Release 1.0.0 of all packages.

### Patch Changes

- Updated dependencies [b010e14]
  - @thexjs/adapter-vercel@1.0.0
  - @thexjs/core@1.0.0

## 0.1.8

### Patch Changes

- 72ca613: Add runtime test coverage for the request pipeline, server actions, image
  proxy, env validation, Vercel build output, and the CLI; add release
  automation (changesets + CI enforcement).
- Updated dependencies [72ca613]
  - @thexjs/core@0.1.7
  - @thexjs/adapter-vercel@0.1.4
