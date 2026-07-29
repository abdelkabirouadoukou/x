import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BuildManifest, VercelAdapterOptions } from "./types";

export interface VercelConfigRoute {
  handle?: "filesystem";
  src?: string;
  dest?: string;
}

/** `.vercel/output/config.json` -- static assets first, then (only if the
 *  app has any server-mode pages / API routes / actions) fall back every
 *  remaining request to the render function. Apps that are 100% static
 *  (SSG only) get NO function at all -- filesystem routing is enough. */
export function writeConfigJson(outputDir: string, manifest: BuildManifest): void {
  mkdirSync(outputDir, { recursive: true });
  const routes: VercelConfigRoute[] = [{ handle: "filesystem" }];
  if (manifest.hasServerSurface) {
    routes.push({ src: "/(.*)", dest: "/render" });
  }
  writeFileSync(
    join(outputDir, "config.json"),
    JSON.stringify({ version: 3, routes }, null, 2),
    "utf-8",
  );
}

/** `.vercel/output/functions/render.func/.vc-config.json` */
export function writeFunctionConfig(functionDir: string, runtime: string): void {
  writeFileSync(
    join(functionDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime,
        handler: "index.mjs",
        launcherType: "Nodejs",
        shouldAddHelpers: true,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

/** Copies the client build output (already produced by `@thexjs/core`'s
 *  `build()` into `<outDir>/client`) plus any additional static dirs into
 *  `.vercel/output/static/`. */
export function copyStaticAssets(
  outputDir: string,
  clientDir: string,
  additionalStaticDirs: string[] = [],
): void {
  const staticDir = join(outputDir, "static");
  mkdirSync(staticDir, { recursive: true });
  if (existsSync(clientDir)) {
    cpSync(clientDir, staticDir, { recursive: true });
  }
  for (const dir of additionalStaticDirs) {
    if (existsSync(dir)) cpSync(dir, staticDir, { recursive: true });
  }
}

export function resolveOutputDir(options: VercelAdapterOptions): string {
  const projectRoot = options.projectRoot ?? process.cwd();
  return options.outputDir ?? join(projectRoot, ".vercel", "output");
}
