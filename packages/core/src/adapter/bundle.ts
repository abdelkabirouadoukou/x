import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Bundles the render function into a single standalone ESM file with the
 * whole SSR/API dependency graph inlined (`@thexjs/core`, `react`,
 * `react-dom`, every route/layout/middleware/action module) so it runs on a
 * platform's Node runtime with zero `node_modules` and zero dynamic
 * filesystem access at request time.
 *
 * `entrySource` (as produced by `generateAdapterEntry`, plus whatever
 * platform bridge the adapter appended) should reference the transpiled
 * module refs by compiled path. The scratch dir lives *inside* `functionDir`
 * (inside the project tree) so Bun's bare-import resolution walks up to the
 * project's real `node_modules`.
 */
export async function bundleRenderFunction(
  functionDir: string,
  entrySource: string,
): Promise<void> {
  mkdirSync(functionDir, { recursive: true });
  const scratchDir = join(functionDir, ".scratch");
  mkdirSync(scratchDir, { recursive: true });

  try {
    const entryPath = join(scratchDir, "entry.mjs");
    writeFileSync(entryPath, entrySource, "utf-8");

    const result = await Bun.build({
      entrypoints: [entryPath],
      target: "node",
      format: "esm",
      splitting: false,
      minify: false,
    });

    if (!result.success || result.outputs.length === 0) {
      const messages = result.logs.map((l) => l.message).join("\n");
      throw new Error(`[@thexjs/core] failed to bundle render function:\n${messages}`);
    }

    const [output] = result.outputs;
    const code = await (output as Blob).text();
    writeFileSync(join(functionDir, "index.mjs"), code, "utf-8");
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}
