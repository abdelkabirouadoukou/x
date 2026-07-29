import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BuildManifest } from "./types";
import { generateEntrySource } from "./generate-entry";
import { transpileModules } from "./transpile";
import { allModuleRefs } from "./scan";

/**
 * Produces `.vercel/output/functions/render.func/index.mjs`: a single
 * standalone ESM file with the whole SSR/API dependency graph inlined
 * (`@thexjs/core`, `react`, `react-dom`, every route/layout/middleware/action
 * module) so it runs on Vercel's `nodejs*.x` runtime with zero `node_modules`
 * and zero dynamic filesystem access at request time.
 */
export async function bundleRenderFunction(
  manifest: BuildManifest,
  functionDir: string,
): Promise<void> {
  mkdirSync(functionDir, { recursive: true });

  const scratchDir = mkdtempSync(join(tmpdir(), "x-vercel-"));

  // 1. Transpile every referenced .tsx/.ts file (routes, layouts,
  //    middleware, actions, 404, root layout) into plain Node-runnable ESM.
  const refs = allModuleRefs(manifest);
  await transpileModules(refs);

  // 2. Generate the entry file that statically imports all of the above and
  //    implements the request dispatcher + Node<->Web bridge.
  const entryPath = join(scratchDir, "entry.mjs");
  const entrySource = generateEntrySource(manifest, scratchDir);
  writeFileSync(entryPath, entrySource, "utf-8");

  // 3. Bundle the entry (this time with NO externals) into one standalone
  //    file that becomes the function's handler.
  const result = await Bun.build({
    entrypoints: [entryPath],
    target: "node",
    format: "esm",
    splitting: false,
    minify: false,
  });

  if (!result.success || result.outputs.length === 0) {
    const messages = result.logs.map((l) => l.message).join("\n");
    throw new Error(`[adapter-vercel] failed to bundle render function:\n${messages}`);
  }

  const [output] = result.outputs;
  const code = await (output as Blob).text();
  writeFileSync(join(functionDir, "index.mjs"), code, "utf-8");
}
