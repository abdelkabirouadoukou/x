# x

A full-stack React framework. Astro-style static-first frontend with islands,
Next.js-style backend (file-based API/server routes, SSR), running on Bun —
`Bun.serve()` and Bun's own bundler are the dev server and build tool, no
separate bundler stack.

Status: early. See [`TASKS.md`](./TASKS.md) for the current build order and
what's explicitly deferred.

## Layout

```
packages/core   the framework runtime: file-based router, SSR renderer
packages/cli    x dev / x build / x start
examples/basic  a small app that exercises whatever's currently built
```

## Quick start

```bash
bun install                    # installs deps + links the `x` CLI
cd examples/basic
x dev                          # start dev server with hot reload
```

The `x` CLI is registered via `bun link` during `postinstall`. If you prefer
not to rely on that, invoke it directly:

```bash
bun packages/cli/src/index.ts dev
```

## Development

```bash
bun test        # run the test suite
bun run typecheck
bun run lint
```

## Production build

```bash
x build          # static export + server bundle -> .x/
x start          # start the production server from .x/
```

## Route conventions

```
src/routes/index.tsx          ->  /
src/routes/about.tsx          ->  /about
src/routes/posts/[id].tsx     ->  /posts/:id
src/routes/docs/[...all].tsx  ->  /docs/*
```

Files and directories prefixed with `_` are skipped (layouts, private
helpers) — not wired up to anything yet.
