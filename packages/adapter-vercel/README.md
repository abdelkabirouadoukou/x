# @thexjs/adapter-vercel

Vercel [Build Output API v3](https://vercel.com/docs/build-output-api/v3) adapter for `@thexjs`
apps. Produces a `.vercel/output/` tree directly -- **no `vercel.json` required**.

```sh
bun add -d @thexjs/adapter-vercel
x build --adapter vercel
vercel deploy --prebuilt
```

## What it produces

```
.vercel/output/
  config.json                    routes: filesystem first, then fallback -> render
  static/                        HTML, CSS, island JS chunks (served via Vercel's CDN)
  functions/render.func/
    .vc-config.json              runtime: nodejs20.x, handler: index.mjs
    index.mjs                    standalone SSR + API bundle
```

If your app is 100% static (every page is `mode = "static"`, no API routes, no server
actions), no function is emitted at all -- `config.json` only does filesystem routing.

## How it works

1. Runs `@thexjs/core`'s normal `build()` to prerender every static-mode page/content
   entry and compile island bundles -- this becomes `static/`.
2. Separately resolves every *server-mode* page, API route, layout, middleware file,
   and server-action file **at build time** (reusing `@thexjs/core`'s own scanners), so
   nothing at request time depends on walking the filesystem or on a dynamic
   `import(path)` of a `.tsx` file -- both of those only work under Bun.
3. Transpiles each of those files from Bun-flavored TSX/TS into plain Node ESM, then
   bundles them together with `@thexjs/core` and React into one standalone `index.mjs`.
4. Bridges Vercel's Node-style `(req, res)` function invocation to `@thexjs`'s
   Web-standard `Request`/`Response` handler, streaming the response body through
   (so `renderToReadableStream`-based SSR streams end-to-end, not just non-streaming
   pages).

## Options

```ts
import { buildVercelOutput } from "@thexjs/adapter-vercel";

await buildVercelOutput({
  projectRoot: process.cwd(),
  pagesDir: "src/pages",
  apiDir: "src/api",
  layoutsDir: "src/layouts",
  actionsDir: "src/actions",
  contentDir: "content",
  outputDir: ".vercel/output", // default
  runtime: "nodejs20.x",       // "nodejs18.x" | "nodejs20.x" | "nodejs22.x"
});
```

## Known limitations (follow-up work)

- ISR-style `revalidate` caching (in-memory in the long-running Bun dev/prod server)
  doesn't carry over to stateless serverless invocations -- use Vercel's own
  `Cache-Control`/CDN caching on the response instead.
- Markdown `contentDir` entries are always statically prerendered (matches
  `@thexjs/core`'s `build()` behavior today) -- there's no server-mode content route yet.
