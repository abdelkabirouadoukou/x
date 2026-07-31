import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { type ComponentType, type ReactNode, createElement } from "react";
import { type ContentEntry, renderMarkdown, scanContent } from "./content";
import { IslandProvider, createIslandRegistry } from "./island";
import {
  actionsRewritePlugin,
  generateFallbackHydration,
  generateHydrateEntry,
  islandEntryId,
  wrapIslandBundle,
} from "./island-bundle";
import { renderStaticPage } from "./render";
import {
  type RouteEntry,
  findLayoutChain,
  scanApiDir,
  scanLayouts,
  scanLayoutsDir,
  scanPages,
  scanRoutes,
} from "./router";
import { assertNoEnvLeakage } from "./security/env-isolation";
import { registerServerFunctions } from "./server-functions";

export type RouteMode = "static" | "server";

export interface BuildOptions {
  routesDir?: string;
  pagesDir?: string;
  apiDir?: string;
  layoutsDir?: string;
  actionsDir?: string;
  contentDir?: string;
  outDir?: string;
  /**
   * Absolute path to the project's x.config.ts/js/mjs, if any. When set, the
   * generated production server entry re-imports it at startup and forwards
   * its `security`/`observability` fields into `createApp()` — those fields
   * can hold live values (rate-limit key functions, error reporters, health
   * checks) that can't be serialized into the generated file directly.
   */
  configPath?: string;
}

interface LoadedPage {
  entry: RouteEntry;
  mode: RouteMode;
  filePath: string;
  Component: ComponentType<{ params: Record<string, string> }>;
  layoutModules: ComponentType<{ children: ReactNode }>[];
  layoutFilePaths: string[];
}

export async function build(options: BuildOptions): Promise<void> {
  const outDir = options.outDir ?? join(process.cwd(), ".x");
  const clientDir = join(outDir, "client");
  const serverDir = join(outDir, "server");
  const islandsDir = join(clientDir, "_islands");

  mkdirSync(clientDir, { recursive: true });
  mkdirSync(serverDir, { recursive: true });
  mkdirSync(islandsDir, { recursive: true });

  const pagesDir = options.pagesDir ?? options.routesDir ?? "";
  const apiDir = options.apiDir;
  const actionsDir = options.actionsDir;
  const layoutsDir = options.layoutsDir ?? pagesDir;

  // Resolve public/ the same way the dev server does (createApp.ts),
  // so static builds ship the same stylesheet/assets dev mode serves.
  const projectRoot = pagesDir ? join(pagesDir, "..", "..") : process.cwd();
  const publicDir = join(projectRoot, "public");
  const hasPublicDir = existsSync(publicDir);
  const stylesheetHref =
    hasPublicDir && existsSync(join(publicDir, "styles.css")) ? "/styles.css" : undefined;

  if (hasPublicDir) {
    cpSync(publicDir, clientDir, { recursive: true });
    console.log(`[x] build: copied public/ -> ${relative(process.cwd(), clientDir)}`);
  }

  let routeEntries: RouteEntry[] = [];
  if (pagesDir && existsSync(pagesDir)) {
    routeEntries = scanPages(pagesDir);
  }
  if (apiDir && existsSync(apiDir)) {
    routeEntries.push(...scanApiDir(apiDir));
  }
  const legacyApiDir = pagesDir ? join(pagesDir, "api") : "";
  if (legacyApiDir && existsSync(legacyApiDir) && legacyApiDir !== apiDir) {
    routeEntries.push(...scanApiDir(legacyApiDir));
  }

  // Scan actions. Every action file is registered server-side (below) AND
  // recorded in `actionModules`, keyed by its absolute file path. The island
  // bundler uses that map to intercept any client-side import of an action
  // file and swap it for a generated fetch() client instead — so a component
  // can `import { subscribeUser } from "../actions/subscribe"` and call it
  // directly, without the real (db-touching) implementation ever reaching
  // the browser bundle.
  const actionModules = new Map<string, { parentPath: string; fnNames: string[] }>();
  if (actionsDir && existsSync(actionsDir)) {
    for (const actionFile of scanRoutes(actionsDir)) {
      const mod = (await import(actionFile.filePath)) as Record<string, unknown>;
      const segments = actionFile.routePath.split("/").filter(Boolean);
      const parentPath = `/${segments.slice(0, -1).join("/")}`;
      const fnNames: string[] = [];

      const actions = mod.actions as
        | Record<string, (...args: unknown[]) => Promise<unknown>>
        | undefined;
      if (actions) {
        registerServerFunctions(parentPath, actionFile.paramNames, actions);
        fnNames.push(...Object.keys(actions));
      }
      for (const [key, value] of Object.entries(mod)) {
        if (key === "default" || key === "actions" || typeof value !== "function") continue;
        registerServerFunctions(parentPath, actionFile.paramNames, {
          [key]: value as (...args: unknown[]) => Promise<unknown>,
        });
        fnNames.push(key);
      }

      if (fnNames.length > 0) {
        actionModules.set(actionFile.filePath, { parentPath, fnNames });
      }
    }
  }

  // Layouts: dedicated dir + nested _layout.tsx
  const dedicatedLayouts =
    layoutsDir && layoutsDir !== pagesDir && existsSync(layoutsDir)
      ? scanLayoutsDir(layoutsDir)
      : [];
  const nestedLayouts = pagesDir && existsSync(pagesDir) ? scanLayouts(pagesDir) : [];
  const layouts = [...dedicatedLayouts, ...nestedLayouts];

  const staticPages: LoadedPage[] = [];
  const serverPages: LoadedPage[] = [];
  const apiRoutes: RouteEntry[] = [];

  for (const entry of routeEntries) {
    if (entry.isApi) {
      apiRoutes.push(entry);
      continue;
    }

    const mod = (await import(entry.filePath)) as {
      default?: ComponentType<{ params: Record<string, string> }>;
      mode?: RouteMode;
    };
    const Component = mod.default;
    if (!Component) {
      console.warn(`[x] ${entry.filePath} has no default export -- skipping`);
      continue;
    }

    const mode = mod.mode ?? "server";
    const layoutChain = findLayoutChain(entry.filePath, layouts, pagesDir);
    for (const rootLayout of dedicatedLayouts) {
      if (!layoutChain.some((l) => l.filePath === rootLayout.filePath)) {
        layoutChain.unshift(rootLayout);
      }
    }
    const layoutModules: ComponentType<{ children: ReactNode }>[] = [];
    for (const l of layoutChain) {
      const layoutMod = (await import(l.filePath)) as {
        default?: ComponentType<{ children: ReactNode }>;
      };
      if (layoutMod.default) layoutModules.push(layoutMod.default);
    }

    const page: LoadedPage = {
      entry,
      filePath: entry.filePath,
      mode,
      Component,
      layoutModules,
      layoutFilePaths: layoutChain.map((l) => l.filePath),
    };

    if (mode === "static") {
      staticPages.push(page);
    } else {
      serverPages.push(page);
    }
  }

  let contentEntries: ContentEntry[] = [];
  if (options.contentDir) {
    contentEntries = scanContent(options.contentDir);
  }

  console.log(
    `[x] build: ${staticPages.length} static, ${serverPages.length} server, ${contentEntries.length} content pages`,
  );

  const writtenPaths = new Set<string>();

  for (const page of staticPages) {
    const params: Record<string, string> = {};
    const registry = createIslandRegistry();
    const pageContent = renderPageWithLayout(page.Component, params, page.layoutModules);
    const content = createElement(IslandProvider, { registry }, pageContent);
    const html = renderStaticPage(content, { stylesheet: stylesheetHref });

    const outPath =
      page.entry.routePath === "/" ? "/index.html" : `${page.entry.routePath}/index.html`;
    const fullPath = join(clientDir, outPath);
    mkdirSync(join(fullPath, ".."), { recursive: true });

    if (writtenPaths.has(outPath)) {
      console.warn(`  [warn] collision: ${page.entry.routePath} overwrites existing output`);
    }
    writtenPaths.add(outPath);

    let islandScripts: string[] = [];
    if (registry.entries.length > 0) {
      const uniqueNames = [...new Set(registry.entries.map((e) => e.name))];
      islandScripts = await bundleRouteIslands(
        page.filePath,
        page.layoutFilePaths,
        uniqueNames,
        islandsDir,
        actionModules,
      );
      console.log(
        `  [islands] ${uniqueNames.length} island(s) on ${page.entry.routePath} -> ${islandScripts.join(", ")}`,
      );
    }

    const finalHtml = renderStaticPage(content, { islandScripts, stylesheet: stylesheetHref });
    writeFileSync(fullPath, finalHtml, "utf-8");
    console.log(`  [static] ${page.entry.routePath} -> ${outPath}`);
  }

  for (const content of contentEntries) {
    const registry = createIslandRegistry();
    const bodyHtml = renderMarkdown(content.body);
    const pageContent = createElement(StaticContentPage, {
      content,
      bodyHtml,
    });
    const rendered = createElement(IslandProvider, { registry }, pageContent);
    const html = renderStaticPage(rendered, {
      title: (content.frontmatter.title as string) ?? content.slug,
      stylesheet: stylesheetHref,
    });

    const outPath = content.routePath === "/" ? "/index.html" : `${content.routePath}/index.html`;
    const fullPath = join(clientDir, outPath);
    mkdirSync(join(fullPath, ".."), { recursive: true });

    if (writtenPaths.has(outPath)) {
      console.warn(`  [warn] collision: content ${content.routePath} overwrites existing output`);
    }
    writtenPaths.add(outPath);

    writeFileSync(fullPath, html, "utf-8");
    console.log(`  [content] ${content.routePath} -> ${outPath}`);
  }

  if (pagesDir || options.routesDir || options.contentDir) {
    const srvOpts: Record<string, string | undefined> = {
      pagesDir: pagesDir || options.routesDir || "",
    };
    if (options.apiDir) srvOpts.apiDir = options.apiDir;
    if (options.layoutsDir) srvOpts.layoutsDir = options.layoutsDir;
    if (options.actionsDir) srvOpts.actionsDir = options.actionsDir;
    if (options.contentDir) srvOpts.contentDir = options.contentDir;

    const configImportPath = options.configPath
      ? relativeImportPath(serverDir, options.configPath)
      : undefined;

    const serverEntry = buildServerEntry(
      srvOpts as {
        pagesDir: string;
        apiDir?: string;
        layoutsDir?: string;
        actionsDir?: string;
        contentDir?: string;
      },
      configImportPath,
    );
    const serverEntryPath = join(serverDir, "index.ts");
    writeFileSync(serverEntryPath, serverEntry, "utf-8");
    console.log(
      `  [server] ${serverPages.length} page routes, ${apiRoutes.length} api routes -> server/index.ts`,
    );
  }

  console.log(`[x] build complete -> ${outDir}`);
}

async function bundleRouteIslands(
  routeFilePath: string,
  layoutFilePaths: string[],
  islandNames: string[],
  islandsDir: string,
  actionModules: Map<string, { parentPath: string; fnNames: string[] }>,
): Promise<string[]> {
  const entryId = islandEntryId(routeFilePath);
  const outdir = join(islandsDir, entryId);
  mkdirSync(outdir, { recursive: true });
  const bundlePath = join(outdir, `${entryId}.js`);

  const hydrateEntry = generateHydrateEntry(routeFilePath, layoutFilePaths);
  const entryPath = join(outdir, `${entryId}.tsx`);
  writeFileSync(entryPath, hydrateEntry, "utf-8");

  try {
    const result = await Bun.build({
      entrypoints: [entryPath],
      target: "browser",
      plugins: [actionsRewritePlugin(actionModules)],
    });

    if (result.success) {
      const outputs = result.outputs.filter((o) => o.kind === "entry-point");
      const built = outputs[0] ?? result.outputs[0];
      if (!built) throw new Error("bun build produced no output");
      const code = await built.text();
      assertNoEnvLeakage(code, bundlePath);
      writeFileSync(bundlePath, wrapIslandBundle(code), "utf-8");
      return [`/_islands/${entryId}/${entryId}.js`];
    }
    for (const log of result.logs) {
      console.warn(`  [islands] build error: ${log.message}`);
    }
  } catch (err) {
    console.warn(`  [islands] build failed for ${routeFilePath}:`, err);
  }

  writeFileSync(bundlePath, wrapIslandBundle(generateFallbackHydration(islandNames)), "utf-8");
  return [`/_islands/${entryId}/${entryId}.js`];
}

function renderPageWithLayout(
  Component: ComponentType<{ params: Record<string, string> }>,
  params: Record<string, string>,
  layoutModules: ComponentType<{ children: ReactNode }>[],
): ReactNode {
  let content: ReactNode = createElement(Component, { params });
  // layoutModules is ordered outermost-first (root layout first). Wrapping
  // sequentially would leave the last layout outermost (inverted nesting),
  // so wrap in reverse -- matching createApp's wrapWithLayouts.
  for (const Layout of [...layoutModules].reverse()) {
    content = createElement(Layout, null, content);
  }
  return content;
}

function StaticContentPage({
  content,
  bodyHtml,
}: {
  content: ContentEntry;
  bodyHtml: string;
}) {
  return createElement(
    "article",
    null,
    content.frontmatter.title
      ? createElement("h1", null, content.frontmatter.title as string)
      : null,
    createElement("div", {
      // biome-ignore lint/security/noDangerouslySetInnerHtml: body is markdown rendered to HTML
      dangerouslySetInnerHTML: { __html: bodyHtml },
    }),
  );
}

function buildServerEntry(opts: Record<string, string>, configImportPath?: string): string {
  const dirKeys = ["pagesDir", "apiDir", "layoutsDir", "actionsDir", "contentDir"];
  const lines = [
    "// Auto-generated by @thexjs/core build",
    'import { createApp } from "@thexjs/core";',
  ];

  if (configImportPath) {
    lines.push("", "let userConfig = {};", "try {");
    lines.push(`  const mod = await import(${JSON.stringify(configImportPath)});`);
    lines.push("  userConfig = mod.default ?? {};");
    lines.push("} catch (err) {");
    lines.push(
      '  console.warn("[x] failed to load x.config for security/observability options:", err);',
    );
    lines.push("}");
  }

  lines.push("", "const app = await createApp({");
  for (const key of dirKeys) {
    const val = opts[key];
    if (val) lines.push(`  ${key}: ${JSON.stringify(val)},`);
  }
  lines.push('  port: parseInt(process.env.PORT || "3000", 10),', "  development: false,");
  if (configImportPath) {
    // security/observability can hold live values (rate-limit key functions,
    // error reporters, health checks) so these come from the user's own
    // config module at runtime rather than being inlined as JSON above.
    lines.push("  ...(userConfig.security ? { security: userConfig.security } : {}),");
    lines.push(
      "  ...(userConfig.observability ? { observability: userConfig.observability } : {}),",
    );
    lines.push("  ...(userConfig.images ? { images: userConfig.images } : {}),");
  }
  lines.push(
    "});",
    "",
    "const server = Bun.serve(app);",
    "",
    "console.log(`[x] production server running at ${server.url}`);",
  );
  return lines.join("\n");
}

/** Relative import specifier from `fromDir` to `toFile`, POSIX-separated and extensionless. */
function relativeImportPath(fromDir: string, toFile: string): string {
  const rel = relative(fromDir, toFile)
    .replace(/\\/g, "/")
    .replace(/\.(ts|js|mjs)$/, "");
  return rel.startsWith(".") ? rel : `./${rel}`;
}
