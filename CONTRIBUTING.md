# Contributing to x

Thanks for wanting to help. This is a small solo framework project, so a few
guidelines keep it reviewable and consistent.

## Project layout

```
packages/core                framework runtime (router, SSR/SSG, islands, server functions, data layer)
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

1. Branch off `main` and give the branch a short, descriptive name.
2. Make the change. Prefer small, focused commits; use the repo's commit style
   (`feat:`, `fix:`, `docs:`, `chore:`).
3. Add or update tests for anything in `packages/core` — every feature has a
   test file next to its source (`*.test.ts`), run with `bun test`.
4. Run `bun run lint`, `bun run typecheck`, and `bun test` before pushing.
   CI runs the same three on both Ubuntu and macOS.
5. If you change templates in `packages/create-thexjs-app/templates/*`, also
   update the matching `examples/*` app so they stay in sync (they're kept as
   parallel dogfood copies).

## Code style

- **Biome** (double quotes, 2-space indent, semicolons, trailing commas).
- **TypeScript strict** — `strict`, `noUncheckedIndexedAccess`,
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

- **`src/x-routes.ts` and `.x/`** are generated — never edit them by hand.
- **Env isolation**: never read a non-`THEXJS_PUBLIC_` env var in client code;
  the build fails if you do.
- **postinstall** builds all packages; if it fails, run `bun run build:packages`.

## Code of conduct

Be respectful. This project follows the [Contributor Covenant][covenant] — see
`CODE_OF_CONDUCT.md`.

## Questions

Open a discussion or an issue. For security issues, see `SECURITY.md` — do not
file a public issue.

[covenant]: https://www.contributor-covenant.org/
