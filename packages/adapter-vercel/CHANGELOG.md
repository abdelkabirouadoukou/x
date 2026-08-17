# @thexjs/adapter-vercel

## 1.0.8

### Patch Changes

- e4ad9ee: fix(adapter): emit server-mode islands to disk and wire them into the render function
  
  Server-mode pages (e.g. a home page using the GitHub loader) never shipped
  their client islands in production: `bundleRouteIslands()` built bundles in
  memory only, `adapter/scan.ts` precomputed resolved routes/actions before
  island discovery ran, and `adapter-vercel` hardcoded `islandScripts: []`. The
  resulting production HTML referenced `/_islands/...` script files that were
  absent from Vercel's output, so `client="load"` islands (scroll-spy, analytics,
  hero scroll cue) never hydrated.
  
  Now `bundleRouteIslandsToDisk()` writes the shared island bundle (and its
  module dependency graph) under the adapter's `islandsDir`, the adapter resolves
  them into the route's `islandScripts`, `generate-entry` emits them into the
  render function, and adapter-vercel passes `islandsDir: <dir>/client` so the
  bundles land in `static/_islands/...` and are served by the CDN.
- Updated dependencies [e4ad9ee]
  - @thexjs/core@1.3.1

## 1.0.7

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
