# Versioning policy

How `x` versions and releases the `@thexjs/*` packages. This is the contract
consumers can rely on once a package hits `1.0.0`; the policy is enforced by
[Changesets](https://changesets.github.io) and the release workflow in
`CONTRIBUTING.md#releasing`.

## Baseline

All `@thexjs/*` packages are released in **lockstep** on a single versioning
PR per cycle: one changeset can bump several packages, and the changelogs are
written together. There is no independent release cadence per package.

| Package | Status | Since |
|---|---|---|
| `@thexjs/core` | `1.x` | 1.0.0 |
| `@thexjs/auth` | `3.x` | 1.0.0 |
| `@thexjs/env` | `1.x` | 1.0.0 |
| `@thexjs/cli` | `1.x` | 1.0.0 |
| `@thexjs/hooks` | `0.x` | — (pre-1.0) |
| `@thexjs/mcp` | `0.x` | — (pre-1.0) |
| `@thexjs/adapter-vercel` | `1.x` | 1.0.0 |
| `create-thexjs-app` | `1.x` | 1.0.0 |

`1.0.0` is the first tagged baseline. Before a package reaches `1.0.0`
(currently only `@thexjs/hooks`), bump conservatively: prefer `patch`, avoid
surprise `minor`s.

## What counts as a breaking change

A change is **breaking (major)** if it requires a consumer to change code or
config to keep working after upgrading:

- Removing or renaming an exported API (`createApp`, `defineAuth`, ...) or a
  public type.
- Changing a function's signature in a way that breaks existing callers
  (new required parameter, changed return type).
- Changing the shape of persisted data that is not migrated (session payloads,
  migration table rows).
- Changing defaults that alter observable behavior (e.g. which headers are
  applied, what a 404 renders as).
- Dropping support for a Bun version the framework previously documented as
  supported.

**Non-breaking** changes (patch) include: bug fixes, internal refactors,
performance improvements, and new exports that don't change existing behavior.
**New features** that are strictly additive (new function, new optional
option) are `minor`.

## Deprecation window

Public API is removed in stages so consumers can upgrade without a cliff:

1. **Deprecation** — the export is marked `@deprecated` in its JSDoc and, where
   practical, logs a warning pointing at the replacement. Deprecated in
   version `N`.
2. **Minimum window** — the deprecated export stays functional for at least two
   minor releases, or one full major cycle, whichever is longer. It is not
   removed before version `N+2` (e.g. deprecated in `1.4.0`, earliest removal
   is `1.6.0`; deprecated in `1.x`, earliest removal is `2.0.0`).
3. **Removal** — happens only in a major release, and is recorded as a breaking
   changelog entry that names the replacement.

Internal helpers (prefix `_`, or not exported from the package entry point) are
not public API and can change at any time.

## Pre-releases (canary / next)

Pre-release tags follow Changesets' `pre` mode:

- `x version` runs with a `pre` tag of `next` for `@thexjs/*@next`, `canary`
  for `@thexjs/*@canary`. Pre-release version numbers are valid semver
  (e.g. `1.5.0-next.0`).
- Consumers pin pre-releases explicitly: `bun add @thexjs/core@next`. `next`
  is the default stable channel's forward-looking tag and should not be treated
  as a stable floor.
- To start a pre-release cycle run `bun changeset pre enter next`; exit it with
  `bun changeset pre exit` before tagging the final release.

## The release flow (summary)

`CONTRIBUTING.md#releasing` has the operational details. In short:

1. Every PR touching `packages/*` adds a changeset (CI enforces this).
2. Merge to `main` triggers `.github/workflows/release.yml`, which opens a
   "Version Packages" PR (bumps + changelogs).
3. Merging that PR publishes the bumped packages to npm via
   `changeset publish` (requires `NPM_TOKEN` in repo secrets).

## What we don't do

- No silent behavior changes in a patch release.
- No removal of a documented export without the deprecation window above.
- No per-package "hotfix" releases that skip the lockstep cycle.
