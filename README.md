<p align="center">
  <svg viewBox="0 0 24 24" width="64" height="64" fill="none">
    <polygon points="3,5 5,3 21,19 19,21" fill="currentColor" />
    <polygon points="19,5 21,3 5,21 3,19" fill="currentColor" opacity="0.4" />
  </svg>
</p>

<p align="center">
  A full-stack React framework for Bun — static sites, SSR, API routes, and server functions, all in one process.
</p>

---

## Layout

```
packages/core      framework runtime: file-based router, SSR renderer, middleware
packages/cli       x dev / x build / x start
packages/env       type-safe environment variable validation
examples/basic     basic app exercising pages, API routes, server functions
examples/landing   full marketing site with docs, blog, features
```

## Quick start

```bash
bun install                    # installs deps + links the x CLI
cd examples/basic
x dev                          # start dev server with hot reload
```

## Development

```bash
bun test            # run the test suite
bun run typecheck
bun run lint
```

## Production build

```bash
x build             # static export + server bundle -> .x/
x start             # start the production server from .x/
```

## Route conventions

```
src/pages/index.tsx             ->  /
src/pages/about.tsx             ->  /about
src/pages/posts/[id].tsx        ->  /posts/:id
src/pages/docs/[...all].tsx     ->  /docs/*
```

Files and directories prefixed with `_` are skipped (layouts, private helpers).

---

<p align="center">
  <a href="./TASKS.md">Build status</a>
</p>
