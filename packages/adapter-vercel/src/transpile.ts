import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { CompiledModuleRef } from "./types";

/**
 * Transpiles each referenced route/layout/middleware/action source file
 * (TSX/TS, authored for Bun) into a standalone Node-runnable ESM module.
 *
 * We deliberately transpile file-by-file (rather than letting the final
 * bundle step follow dynamic `import()` calls) because `@thexjs/core`'s own
 * scanners find these files by walking the filesystem at *runtime* -- that
 * strategy only works on Bun, which understands `.tsx`/`.ts` natively.
 * Vercel's Node.js runtime does not, so every route file that will run
 * inside the render function has to already be plain JS before it gets
 * there. `react`/`react-dom`/`@thexjs/core` stay external here; they get
 * inlined once, together, in the final bundle step (see bundle.ts) so we
 * don't duplicate framework code per-route.
 */
export async function transpileModules(refs: CompiledModuleRef[]): Promise<void> {
  for (const ref of refs) {
    const result = await Bun.build({
      entrypoints: [ref.sourcePath],
      target: "node",
      format: "esm",
      splitting: false,
      external: ["react", "react/*", "react-dom", "react-dom/*", "@thexjs/core", "@thexjs/core/*"],
    });

    if (!result.success || result.outputs.length === 0) {
      const messages = result.logs.map((l) => l.message).join("\n");
      throw new Error(`[adapter-vercel] failed to transpile ${ref.sourcePath}:\n${messages}`);
    }

    const [output] = result.outputs;
    mkdirSync(dirname(ref.compiledPath), { recursive: true });
    await Bun.write(ref.compiledPath, await (output as Blob).arrayBuffer());
  }
}
