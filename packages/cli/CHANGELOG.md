# @thexjs/cli

## 1.1.4

### Patch Changes

- 65c03ea: `x start`: add an `error` event listener on the spawned `bun` process so that a missing `bun` on `PATH` prints a friendly installation message instead of a raw ENOENT stack trace.
  
  `x dev`: add an `error` event listener on the Tailwind file watcher so that inotify exhaustion or directory removal logs a clear warning instead of silently dying.
- 2c1bc35: Document the intentional exit-code asymmetry: bare `x` exits 1 (usage error), `x --help` exits 0 (explicit request). Comment only, no behavior change.
- 65c03ea: `x dev`: add an `error` event listener on the Tailwind file watcher so that inotify exhaustion or directory removal logs a clear warning instead of silently dying.
- Updated dependencies [d9da82e]
  - @thexjs/core@1.7.1

## 1.1.3

### Patch Changes

- b567ad5: Fix the `doctor` version-consistency check to evaluate real semver ranges instead of silently skipping `^`/`~` dependencies, which are what generated projects use.

## 1.1.2

### Patch Changes

- 3234581: Contain process-level crashes and route them to the error reporter (closes #85):
  
  - New `installProcessCrashHandlers()` helper (exported from `@thexjs/core`)
    registers `uncaughtException`/`unhandledRejection` handlers that log the
    crash and report it through the configured error reporter, so a throw
    outside the request lifecycle (module-eval error, rejected background
    promise) is surfaced instead of dying silently. The optional `exitOnCrash`
    flag opts into crash-on-error semantics for supervisor-managed deploys.
  - The generated production server entry now installs these via the shared
    helper instead of inline code, and `x dev` installs identical handlers on the
    dev server — closing the gap where dev had no crash reporting at all.
  - The top-of-fetch boundary (`guardFetchErrors`), the `Bun.serve` `error`
    hook, guarded revalidation JSON parsing and streaming-pump controller
    handling for #92 were already in place; this adds coverage proving a broken
    shared rate-limit store (e.g. Redis outage) surfaces as a 500 while the box
    keeps answering `/healthz`.
  - Worker/subprocess isolation was evaluated and rejected for SSR: per-request
    workers would re-render the whole module graph and provide no isolation for
    shared state/DB; serverless deploys already provide that boundary. Left for
    the threat-model doc (#80).
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
