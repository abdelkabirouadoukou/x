import type { BuildManifest } from "@thexjs/core/adapter";
import {
  adapterScratchDir,
  allModuleRefs,
  bundleRenderFunction as bundleToStandaloneFile,
  transpileModules,
} from "@thexjs/core/adapter";
import { generateEntrySource } from "./generate-entry";

/**
 * Produces `.vercel/output/functions/render.func/index.mjs`: a single
 * standalone ESM file with the whole SSR/API dependency graph inlined
 * (`@thexjs/core`, `react`, `react-dom`, every route/layout/middleware/action
 * module) so it runs on Vercel's `nodejs*.x` runtime with zero `node_modules`
 * and zero dynamic filesystem access at request time.
 *
 * The generic pipeline (build manifest resolution, transpile, bundle) is the
 * `@thexjs/core` adapter SDK; Vercel contributes the Platform-specific entry
 * (Node bridge) and output tree on top.
 */
export async function bundleRenderFunction(
  manifest: BuildManifest,
  functionDir: string,
): Promise<void> {
  // Scratch dir lives *inside* functionDir (i.e. inside the project's own
  // `.vercel/output/` tree) rather than an OS tmpdir. Bun resolves bare
  // imports (`react`, `@thexjs/core`, ...) by walking up from the entry
  // file's directory looking for `node_modules` -- an OS tmpdir has no
  // relationship to the project tree, so that resolution could pick up the
  // wrong install (or nothing at all). Being inside the project tree
  // guarantees the walk-up reaches the project's real `node_modules`.
  //
  // `adapterScratchDir` is the SDK contract both generateEntrySource and
  // bundleRenderFunction agree on.
  const scratchDir = adapterScratchDir(functionDir);

  // 1. Transpile every referenced .tsx/.ts file (routes, layouts,
  //    middleware, actions, 404, root layout) into plain Node-runnable ESM.
  const refs = allModuleRefs(manifest);
  await transpileModules(refs);

  // 2. Compose the entry: generic createApp() boot from the adapter SDK plus
  //    the Vercel Node<->Web bridge. Then bundle it (with NO externals) into
  //    one standalone file that becomes the function's handler.
  const entrySource = generateEntrySource(manifest, scratchDir);
  await bundleToStandaloneFile(functionDir, entrySource);
}
