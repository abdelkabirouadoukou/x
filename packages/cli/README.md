# @thexjs/cli

The `x` command-line tool for [x](https://www.npmjs.com/package/@thexjs/core) framework apps — dev server, production build, and production start, built on [Bun](https://bun.sh).

```sh
bun add @thexjs/cli
```

> Requires Bun (`bun --version` should work on your PATH) — this CLI shells out to `bun`/`bunx` and uses Bun-only APIs (`Bun.serve`, `Bun.argv`).

## Commands

```sh
x dev              # start the dev server with hot reload
x build            # build for production -> .x/ (static export + server bundle)
x start            # run the production server (run `x build` first)

x run dev          # "run" is optional — an alias, for npm/bun muscle memory

-h, --help         # show help
-v, --version      # print the installed @thexjs/cli version
--cwd <dir>        # run as if started inside <dir> instead of the current directory
```

Add them to your `package.json` scripts once `@thexjs/cli` is a dependency:

```json
{
  "scripts": {
    "dev": "x dev",
    "build": "x build",
    "start": "x start"
  }
}
```

## Configuration

The CLI looks for `x.config.ts` (or `.js`/`.mjs`) in the project root and passes its `defineConfig(...)` export straight through to `@thexjs/core`:

```ts
// x.config.ts
import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "./src/pages",
  contentDir: "./src/content",
  port: 3000,
});
```

If no config file is found, it falls back to sensible defaults — `src/pages` (or `routes`) for pages, `content` for content collections if present, and port `3000`.

## What each command does

- **`x dev`** — auto-compiles `src/styles/globals.css` to `public/styles.css` via `bunx tailwindcss` (if that file exists), watches `src/styles` and recompiles on change, then starts `createApp()` from `@thexjs/core` under `Bun.serve`. If the configured port is taken, it tries up to 20 ports upward automatically.
- **`x build`** — compiles Tailwind in production/minified mode, then calls `build()` from `@thexjs/core`, writing:
  - `.x/client/` — prerendered HTML for every page with `export const mode = "static"`, plus your `public/` assets copied alongside them. This directory alone is deployable to any static host (Vercel, Netlify, a CDN, etc.).
  - `.x/server/index.ts` — a server entry covering any page left in the default `"server"` mode, plus your API routes. Requires a Bun-capable host to actually run (see `x start`).
- **`x start`** — runs `.x/server/index.ts` under `bun` with `NODE_ENV=production`. Requires `x build` to have been run first; exits with an error if `.x/server/index.ts` is missing.

## Deployment note

If every page in your app opts into `mode = "static"` and you have no API routes or server functions, you only need `.x/client/` — deploy it as a static site anywhere. If any route stays in the default `"server"` mode (or you have API routes/server functions), you need a host that can keep a Bun process running (Fly.io, a VPS, Docker, Railway, etc.) and run `x start` there — static hosts and Node-only serverless platforms can't run `.x/server/index.ts`.

## License

MIT