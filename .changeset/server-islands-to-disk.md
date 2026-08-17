---
"@thexjs/core": patch
"@thexjs/adapter-vercel": patch
---

fix(adapter): emit server-mode islands to disk and wire them into the render function

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