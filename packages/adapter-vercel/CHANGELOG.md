# @thexjs/adapter-vercel

## 1.0.6

### Patch Changes

- Updated dependencies [de14e71]
  - @thexjs/core@1.3.0

## 1.0.5

### Patch Changes

- b22e149: chore(deps-dev): bump @biomejs/biome from 1.9.4 to 2.5.8 and migrate config (formatting/lint fixes only)
- Updated dependencies [b22e149]
  - @thexjs/core@1.2.4

## 1.0.4

### Patch Changes

- Updated dependencies [c8e7985]
  - @thexjs/core@1.2.3

## 1.0.3

### Patch Changes

- Updated dependencies [c0ff88f]
  - @thexjs/core@1.2.2

## 1.0.2

### Patch Changes

- Updated dependencies [baa688f]
  - @thexjs/core@1.2.1

## 1.0.1

### Patch Changes

- fbd5e29: Extract the platform-agnostic adapter pipeline (build-manifest resolution,
  per-file transpile, standalone render-function bundling, entry generation)
  into `@thexjs/core/adapter` as a documented Adapter SDK. `@thexjs/adapter-vercel`
  now composes the SDK (adding only its Node<->Web Request/Response bridge and
  Build Output API v3 `.vercel/output` tree), so third-party adapters (Node,
  Cloudflare, ...) reuse the same build core instead of reverse-engineering it.

  `@thexjs/adapter-vercel` now requires `@thexjs/core@^1.2.0` (the release that
  introduces the `@thexjs/core/adapter` subpath) so consumers can never resolve
  the adapter against an older core that lacks the SDK export.

  Also hardened the generated Vercel entry: forwarded headers (`x-forwarded-proto`
  / `x-forwarded-host`) are validated instead of blindly trusted, streamed
  responses honor socket backpressure and cancel on client disconnect, the error
  path guards against already-sent headers, generated paths are project-relative,
  and non-JSON-serializable runtime options fail the build instead of silently
  dropping (keeping the deployed function aligned with `x start`).

- Updated dependencies [fbd5e29]
- Updated dependencies [58aa123]
  - @thexjs/core@1.2.0

## 1.0.0

### Major Changes

- b010e14: Release 1.0.0 of all packages.

### Patch Changes

- Updated dependencies [b010e14]
  - @thexjs/core@1.0.0

## 0.1.4

### Patch Changes

- 72ca613: Add runtime test coverage for the request pipeline, server actions, image
  proxy, env validation, Vercel build output, and the CLI; add release
  automation (changesets + CI enforcement).
- Updated dependencies [72ca613]
  - @thexjs/core@0.1.7
