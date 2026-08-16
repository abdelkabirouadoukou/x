import { rmSync } from "node:fs";
import { join } from "node:path";
import { build as coreBuild } from "@thexjs/core";
import { bundleRenderFunction } from "./bundle-function";
import { resolveBuildManifest } from "./scan";
import type { VercelAdapterOptions } from "./types";
import {
  copyStaticAssets,
  resolveOutputDir,
  writeConfigJson,
  writeFunctionConfig,
} from "./write-output";

export type { VercelAdapterOptions } from "./types";

/**
 * Builds a `@thexjs` app into a Vercel Build Output API v3 tree
 * (`.vercel/output/`) -- no `vercel.json` required.
 *
 * ```
 * .vercel/output/
 *   config.json                 routes: filesystem, then fallback -> render
 *   static/                      HTML/CSS/JS -- served from Vercel's CDN
 *   functions/render.func/
 *     .vc-config.json            runtime: nodejs20.x, handler: index.mjs
 *     index.mjs                  standalone SSR + API bundle
 * ```
 *
 * Pipeline:
 *  1. Run `@thexjs/core`'s normal `build()` to prerender every static-mode
 *     page/content entry to HTML and to compile island bundles -- this is
 *     exactly what already ships to `static/`.
 *  2. Separately (see scan.ts), resolve every *server-mode* page, API route,
 *     layout, middleware file and server-action file at build time -- no
 *     runtime fs scanning, no dynamic `import(path)`.
 *  3. Transpile each of those from Bun-flavored TSX/TS into plain Node ESM,
 *     then bundle them together with `@thexjs/core` and React into one
 *     standalone `index.mjs` (see transpile.ts / bundle-function.ts).
 *  4. Write `config.json` + `.vc-config.json`.
 *
 * Apps with no server-mode pages, API routes, or actions produce no
 * function at all -- just static/ + a filesystem-only config.json.
 */
export async function buildVercelOutput(options: VercelAdapterOptions = {}): Promise<void> {
  const outputDir = resolveOutputDir(options);
  const runtime = options.runtime ?? "nodejs20.x";

  // The core build scratch dir lives *inside* the project tree (under the
  // output dir) rather than an OS tmpdir: island bundling writes its hydrate
  // entry next to the build output, and Bun resolves bare imports (`react`,
  // `react-dom/client`, ...) by walking up to `node_modules`. An OS tmpdir
  // has no relationship to the project install, so every island bundle
  // silently falls back to a no-op hydration stub. Inside the tree, the
  // walk-up reaches the project's real node_modules and the islands bundle
  // for real -- identical to `x dev` / `x start`.
  const coreOutDir = join(outputDir, ".scratch-core");
  try {
    console.log("[adapter-vercel] running @thexjs/core build (static pages + islands)...");
    const rest: Record<string, string> = {};
    if (options.pagesDir) rest.pagesDir = options.pagesDir;
    if (options.routesDir) rest.routesDir = options.routesDir;
    if (options.apiDir) rest.apiDir = options.apiDir;
    if (options.layoutsDir) rest.layoutsDir = options.layoutsDir;
    if (options.actionsDir) rest.actionsDir = options.actionsDir;
    if (options.contentDir) rest.contentDir = options.contentDir;
    await coreBuild({ ...rest, outDir: coreOutDir });

    console.log("[adapter-vercel] resolving server-mode routes...");
    const manifestScratchDir = join(outputDir, ".scratch-routes");
    const manifest = await resolveBuildManifest(options, manifestScratchDir);

    console.log(
      `[adapter-vercel] ${manifest.routes.length} server route(s), ${manifest.actions.length} action file(s)`,
    );

    writeConfigJson(outputDir, manifest);
    copyStaticAssets(outputDir, join(coreOutDir, "client"), options.additionalStaticDirs);

    if (manifest.hasServerSurface) {
      const functionDir = join(outputDir, "functions", "render.func");
      console.log("[adapter-vercel] bundling render function...");
      await bundleRenderFunction(manifest, functionDir);
      writeFunctionConfig(functionDir, runtime);
      console.log(`[adapter-vercel] wrote ${functionDir}`);
    } else {
      console.log("[adapter-vercel] no server-mode routes -- skipping render function");
    }

    console.log(`[adapter-vercel] build complete -> ${outputDir}`);
  } finally {
    rmSync(coreOutDir, { recursive: true, force: true });
    rmSync(join(outputDir, ".scratch-routes"), { recursive: true, force: true });
  }
}
