/**
 * Adapter SDK: the generic pieces of the `x build --adapter X` pipeline that
 * are independent of any hosting platform. Third-party adapters
 * (Cloudflare, bare Node, Netlify, ...) implement only the platform-specific
 * output layer on top of these three steps:
 *
 *   1. `resolveBuildManifest(options, scratchDir)`  -- scan every server-mode
 *      route/layout/middleware/action at build time into a `BuildManifest`
 *      (no runtime fs scanning, no dynamic `.tsx` import).
 *   2. `transpileModules(moduleRefs)`              -- compile each referenced
 *      TSX/TS source to a standalone Node-runnable ESM module.
 *   3. `generateAdapterEntry(manifest, entryDir)`  -- emit the entry that
 *      statically imports every module and builds the real `createApp()`
 *      with a pre-resolved manifest, then `bundleRenderFunction()` to inline
 *      the whole graph into one `index.mjs`.
 *
 * The platform-specific layer (e.g. `@thexjs/adapter-vercel` emitting a
 * `.vercel/output` Build Output tree) composes these steps and adds its own
 * request bridge + config files. Adapting different platform classes is just
 * a different write/route layer over an identical build core.
 */
export {
  resolveBuildManifest,
  ModuleRegistry,
  allModuleRefs,
} from "./scan";
export { transpileModules } from "./transpile";
export { generateAdapterEntry, serializeRuntimeOptions } from "./generate-entry";
export { adapterScratchDir, bundleRenderFunction } from "./bundle";
export type {
  AdapterOptions,
  BuildManifest,
  CompiledModuleRef,
  ResolvedAction,
  ResolvedRoute,
} from "./types";
