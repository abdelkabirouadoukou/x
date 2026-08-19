# Contributing to x

Thanks for wanting to help. This is a small solo framework project, so a few
guidelines keep it reviewable and consistent.

## Project layout

Nothing exotic. It's a normal Bun workspaces monorepo:

```
packages/core                framework runtime (router, SSR/SSG, islands, server functions, data layer)
packages/auth                credentials + OAuth2/GitHub auth, sessions, CSRF
packages/cli                 x dev / x build / x start
packages/env                 type-safe env validation
packages/adapter-vercel      Vercel Build Output API adapter
packages/create-thexjs-app   `bun create thexjs-app@latest` scaffolder
examples/*                   dogfood apps (basic, blog, default, landing, saas)
```

## Prerequisites

- [Bun](https://bun.sh) 1.3.x or later
- Node.js is **not** used at any point in this repo

## Setup

```sh
bun install          # builds all packages (postinstall) and links the CLI
```

## Common commands

```sh
bun run dev          # builds packages, then runs examples/basic in dev
bun run build:packages
bun run typecheck    # strict TS across every package + example
bun run lint         # biome check .   (bun run lint:fix to autofix)
bun test             # all tests
bun test <path>      # a single test file
```

## Making changes

Branch off `main`, keep commits small and focused, and use the repo's commit
style (`feat:`, `fix:`, `docs:`, `chore:`), mostly so the changelog reads
okay later, not because I'm precious about git history.

Tests matter more than process here. If you touch `packages/core`, add or
update the test next to the file you changed (`*.test.ts`, run with
`bun test`). I'd rather review a smaller PR with a real test than a big one
without.

Before pushing, run `bun run lint`, `bun run typecheck`, and `bun test`:
CI runs the exact same three on Ubuntu and macOS, so this just saves you a
round trip.

One easy-to-miss thing: if you change a template under
`packages/create-thexjs-app/templates/*`, update the matching `examples/*`
app too. They're kept as parallel dogfood copies on purpose, and they drift
out of sync more often than I'd like to admit.

## Code style

- **Biome** (double quotes, 2-space indent, semicolons, trailing commas).
- **TypeScript strict**: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax` (type-only imports must
  use `import type`).
- No `any`. If a type is painful, cast narrowly with a comment explaining why.
- All packages are `"type": "module"`.

## Testing

Tests use `bun:test`. Fixtures are created in `beforeAll` and cleaned up in
`afterAll` under `__fixtures__/`. Run one file with:

```sh
bun test packages/core/src/router.test.ts
```

## Conventions & gotchas

- **`src/x-routes.ts` and `.x/`** are generated, so never edit them by hand.
- **Env isolation**: never read a non-`THEXJS_PUBLIC_` env var in client code;
  the build fails if you do.
- **postinstall** builds all packages; if it fails, run `bun run build:packages`.

## Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets).

### Adding a changeset

Any PR that changes a **publishable package** (`packages/*`) must include a
changeset. CI enforces this: `.github/workflows/changeset-check.yml` fails the
PR if a `packages/*` change ships without one. Changes that only touch
`examples/*` or docs don't need a changeset.

Run the interactive wizard:

```sh
bun changeset
```

or write the file by hand under `.changeset/<random-name>.md`:

```md
---
"@thexjs/core": patch
"@thexjs/env": patch
---

Short description of the change, written from the user's perspective.
```

Bump levels: `patch` for fixes/refactors, `minor` for new features, `major`
for breaking changes. See `VERSIONING.md` for what counts as breaking, the
deprecation window before removal, and how pre-release (canary/next) tags work.

### What happens on merge to main

The `.github/workflows/release.yml` workflow runs on every push to `main`:

1. Installs dependencies and runs `build:packages`, `typecheck`, `lint`, and
   `test`: the job fails if any of these fail, before anything is released.
2. `changesets/action@v1` then:
   - If pending changesets exist, it opens/updates a **"Version Packages"** PR
     that bumps versions and writes changelogs. Merge that PR.
   - If the merged commit is a versioning commit, it **publishes** every
     bumped package to npm (`bunx changeset publish`).

### Publishing to npm

Publishing requires an npm token as the `NPM_TOKEN` repo secret (plus
`GITHUB_TOKEN`, which GitHub provides automatically). Until `NPM_TOKEN` is
configured in the repo settings, the workflow stops at the versioning PR.
Packages get version-bumped but nothing reaches npm. To set it up: create a
read-only publish token on npmjs.com (with publish access to the `@thexjs`
scope) and add it as a repo secret named `NPM_TOKEN`.

Packages are published with `"publishConfig": { "access": "public" }`; `bun
install`'s postinstall builds them before publishing.

### SBOM on every release

The release workflow's `sbom` job generates a CycloneDX Software Bill of
Materials covering `packages/*` and uploads it as an artifact of the same run
(download under **Actions → run → Artifacts → sbom**). It runs after a
successful `release` job, so an SBOM exists for every release cycle — security
teams and buyers can plug it into their own scanners without asking. Nothing in
`@thexjs/*` changes; this is a CI artifact only.

## Code of conduct

Be respectful. This project follows the [Contributor Covenant][covenant]; see
`CODE_OF_CONDUCT.md`.

## Questions

Open a discussion or an issue. For security issues, see `SECURITY.md`; do not
file a public issue.

[covenant]: https://www.contributor-covenant.org/
