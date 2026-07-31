import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  type LayoutEntry,
  type MiddlewareEntry,
  type RouteEntry,
  findLayoutChain,
  findMiddlewareChain,
  scanApiDir,
  scanLayouts,
  scanLayoutsDir,
  scanMiddleware,
  scanNotFound,
  scanPages,
  scanRoutes,
} from "@thexjs/core";
import type { BuildManifest, CompiledModuleRef, ResolvedAction, ResolvedRoute } from "./types";
import type { VercelAdapterOptions } from "./types";

let idCounter = 0;
function nextIdentifier(prefix: string): string {
  idCounter += 1;
  return `__x_${prefix}_${idCounter}`;
}

/** Registry of every unique source file that needs transpiling, keyed by absolute path. */
export class ModuleRegistry {
  private byPath = new Map<string, CompiledModuleRef>();

  constructor(private scratchDir: string) {}

  ref(sourcePath: string, prefix: string): CompiledModuleRef {
    const existing = this.byPath.get(sourcePath);
    if (existing) return existing;
    const identifier = nextIdentifier(prefix);
    const compiledPath = join(this.scratchDir, `${identifier}.mjs`);
    const entry: CompiledModuleRef = { sourcePath, compiledPath, identifier };
    this.byPath.set(sourcePath, entry);
    return entry;
  }

  all(): CompiledModuleRef[] {
    return [...this.byPath.values()];
  }
}

/**
 * Resolve the full set of server-mode routes, API routes, layout chains,
 * middleware chains and standalone server-action files -- entirely at build
 * time, using the same scanners `createApp`/`build` use internally. Nothing
 * here touches the filesystem at request time, which is what makes the
 * output safe to run on Vercel's Node.js runtime (no dynamic fs scanning,
 * no dynamic `import(path)` of a `.tsx` file).
 */
export async function resolveBuildManifest(
  options: VercelAdapterOptions,
  scratchDir: string,
): Promise<BuildManifest> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const pagesDir = options.pagesDir || options.routesDir || join(projectRoot, "src", "pages");
  const apiDir = options.apiDir;
  const layoutsDir = options.layoutsDir || pagesDir;
  const actionsDir =
    options.actionsDir ??
    (existsSync(join(projectRoot, "src", "actions")) ? join(projectRoot, "src", "actions") : undefined);

  const registry = new ModuleRegistry(scratchDir);

  let found: RouteEntry[] = existsSync(pagesDir) ? scanPages(pagesDir) : [];
  const apiFound: RouteEntry[] = [];
  if (apiDir && existsSync(apiDir)) apiFound.push(...scanApiDir(apiDir));
  const legacyApiDir = join(pagesDir, "api");
  if (existsSync(legacyApiDir) && legacyApiDir !== apiDir) {
    apiFound.push(...scanApiDir(legacyApiDir));
  }
  found = found.filter((r) => !r.isApi);
  found.push(...apiFound);

  const dedicatedLayouts: LayoutEntry[] =
    options.layoutsDir && existsSync(options.layoutsDir) ? scanLayoutsDir(options.layoutsDir) : [];
  const nestedLayouts: LayoutEntry[] = existsSync(pagesDir) ? scanLayouts(pagesDir) : [];
  const layouts = [...dedicatedLayouts, ...nestedLayouts];
  const middlewareEntries: MiddlewareEntry[] = existsSync(pagesDir) ? scanMiddleware(pagesDir) : [];

  const routes: ResolvedRoute[] = [];

  for (const entry of found) {
    if (entry.isApi) {
      routes.push({
        routePath: entry.routePath,
        paramNames: entry.paramNames,
        isApi: true,
        mode: "server",
        route: registry.ref(entry.filePath, "api"),
        layoutChain: [],
        middlewareChain: [],
      });
      continue;
    }

    // Static-mode pages are already fully prerendered to HTML by
    // `@thexjs/core`'s `build()` and shipped under static/ -- only
    // server-mode pages need to live inside the render function.
    const mod = (await import(entry.filePath)) as {
      default?: unknown;
      mode?: "static" | "server";
      revalidate?: number;
      actions?: unknown;
    };
    if (!mod.default && !mod.actions) continue;
    if ((mod.mode ?? "server") === "static") continue;

    const layoutChain = findLayoutChain(entry.filePath, layouts, pagesDir);
    const missingDedicated = dedicatedLayouts.filter(
      (rootLayout) => !layoutChain.some((l) => l.filePath === rootLayout.filePath),
    );
    if (missingDedicated.length > 0) layoutChain.unshift(...missingDedicated);
    const mwChain = findMiddlewareChain(entry.filePath, middlewareEntries, pagesDir);

    routes.push({
      routePath: entry.routePath,
      paramNames: entry.paramNames,
      isApi: false,
      mode: mod.mode ?? "server",
      ...(mod.revalidate !== undefined ? { revalidate: mod.revalidate } : {}),
      route: registry.ref(entry.filePath, "page"),
      layoutChain: layoutChain.map((l) => registry.ref(l.filePath, "layout")),
      middlewareChain: mwChain.map((m) => registry.ref(m.filePath, "mw")),
    });
  }

  const actions: ResolvedAction[] = [];
  if (actionsDir && existsSync(actionsDir)) {
    for (const actionFile of scanRoutes(actionsDir)) {
      const segments = actionFile.routePath.split("/").filter(Boolean);
      const fileName = segments[segments.length - 1] ?? "";
      const parentPath =
        fileName === "index" || !fileName
          ? actionFile.routePath
          : `/${segments.slice(0, -1).join("/")}`;
      actions.push({
        parentPath,
        paramNames: actionFile.paramNames,
        module: registry.ref(actionFile.filePath, "action"),
      });
    }
  }

  const notFoundEntry = existsSync(pagesDir) ? scanNotFound(pagesDir) : null;
  const notFound = notFoundEntry ? registry.ref(notFoundEntry.filePath, "notfound") : undefined;

  const rootLayoutEntry = dedicatedLayouts[0] ?? layouts.find((l) => l.dirPath === pagesDir);
  const rootLayout = rootLayoutEntry
    ? registry.ref(rootLayoutEntry.filePath, "rootlayout")
    : undefined;

  return {
    pagesDirLabel: pagesDir,
    routes,
    actions,
    ...(notFound ? { notFound } : {}),
    ...(rootLayout ? { rootLayout } : {}),
    hasServerSurface: routes.length > 0 || actions.length > 0,
    security: options.security,
    observability: options.observability,
    images: options.images,
  };
}

export function allModuleRefs(manifest: BuildManifest): CompiledModuleRef[] {
  const map = new Map<string, CompiledModuleRef>();
  const add = (ref: CompiledModuleRef) => map.set(ref.sourcePath, ref);
  for (const r of manifest.routes) {
    add(r.route);
    for (const l of r.layoutChain) add(l);
    for (const m of r.middlewareChain) add(m);
  }
  for (const a of manifest.actions) add(a.module);
  if (manifest.notFound) add(manifest.notFound);
  if (manifest.rootLayout) add(manifest.rootLayout);
  return [...map.values()];
}
