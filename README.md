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
packages/cli    x dev / x build / x start (not implemented yet)
examples/basic  a small app that exercises whatever's currently built
```

## Running the example

```bash
bun install
bun --hot examples/basic/server.ts
```

## Development

```bash
bun test        # run the test suite
bun run typecheck
bun run lint
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
