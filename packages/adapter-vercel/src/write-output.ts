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
 *  (SSG only) get NO function at all -- filesystem routing is enough.
 *
 *  When the app allow-lists remote hosts for /_x/image, the native Vercel
 *  `images` config is emitted too, which turns on the platform's Image
 *  Optimization API at /_vercel/image for those same domains. */
export function writeConfigJson(outputDir: string, manifest: BuildManifest): void {
  mkdirSync(outputDir, { recursive: true });
  const routes: VercelConfigRoute[] = [{ handle: "filesystem" }];
  if (manifest.hasServerSurface) {
    routes.push({ src: "/(.*)", dest: "/render" });
  }
  const config: Record<string, unknown> = { version: 3, routes };
  const remoteHosts = manifest.images?.remoteHosts;
  if (remoteHosts && remoteHosts.length > 0) {
    config.images = {
      sizes: [640, 750, 828, 1080, 1200],
      domains: remoteHosts,
      minimumCacheTTL: 60,
    };
  }
  writeFileSync(join(outputDir, "config.json"), JSON.stringify(config, null, 2), "utf-8");
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
