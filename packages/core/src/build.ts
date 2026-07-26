import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { type ComponentType, type ReactNode, createElement } from "react";
import { type ContentEntry, renderMarkdown, scanContent } from "./content";
import { IslandProvider, createIslandRegistry } from "./island";
import { renderStaticPage } from "./render";
import { type RouteEntry, findLayoutChain, scanLayouts, scanRoutes } from "./router";

export type RouteMode = "static" | "server";

export interface BuildOptions {
  routesDir: string;
  contentDir?: string;
  outDir?: string;
}

interface LoadedPage {
  entry: RouteEntry;
  mode: RouteMode;
  filePath: string;
  Component: ComponentType<{ params: Record<string, string> }>;
  layoutModules: ComponentType<{ children: ReactNode }>[];
}

export async function build(options: BuildOptions): Promise<void> {
  const outDir = options.outDir ?? join(process.cwd(), "dist");
  const clientDir = join(outDir, "client");
  const serverDir = join(outDir, "server");
  const islandsDir = join(clientDir, "_islands");

  mkdirSync(clientDir, { recursive: true });
  mkdirSync(serverDir, { recursive: true });
  mkdirSync(islandsDir, { recursive: true });

  const routeEntries = scanRoutes(options.routesDir);
  const layouts = scanLayouts(options.routesDir);

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
    const layoutChain = findLayoutChain(entry.filePath, layouts, options.routesDir);
    const layoutModules: ComponentType<{ children: ReactNode }>[] = [];
    for (const l of layoutChain) {
      const layoutMod = (await import(l.filePath)) as {
        default?: ComponentType<{ children: ReactNode }>;
      };
      if (layoutMod.default) layoutModules.push(layoutMod.default);
    }

    const page: LoadedPage = { entry, filePath: entry.filePath, mode, Component, layoutModules };

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
    const html = renderStaticPage(content);

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
      islandScripts = await bundleRouteIslands(page.filePath, uniqueNames, islandsDir);
      console.log(
        `  [islands] ${uniqueNames.length} island(s) on ${page.entry.routePath} -> ${islandScripts.join(", ")}`,
      );
    }

    const finalHtml = renderStaticPage(content, { islandScripts });
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

  if (serverPages.length > 0 || apiRoutes.length > 0) {
    const serverEntry = buildServerEntry(serverPages, apiRoutes);
    const serverEntryPath = join(serverDir, "index.ts");
    writeFileSync(serverEntryPath, serverEntry, "utf-8");
    console.log(
      `  [server] ${serverPages.length} page routes, ${apiRoutes.length} api routes -> server/index.ts`,
    );

    const bundleResult = Bun.spawnSync([
      "bun",
      "build",
      "--target=bun",
      "--outdir",
      serverDir,
      serverEntryPath,
    ]);
    if (bundleResult.success) {
      console.log("  [server] bundled -> server/index.js");
    } else {
      console.error("  [error] server bundle failed:");
      console.error(bundleResult.stderr.toString());
    }
  }

  console.log(`[x] build complete -> ${outDir}`);
}

async function bundleRouteIslands(
  routeFilePath: string,
  islandNames: string[],
  islandsDir: string,
): Promise<string[]> {
  const entryId = `${basename(routeFilePath).replace(/\.(tsx|ts)$/, "")}-${hash(routeFilePath)}`;
  const outdir = join(islandsDir, entryId);
  mkdirSync(outdir, { recursive: true });
  const bundlePath = join(outdir, `${entryId}.js`);

  const routeRel = join(relative(outdir, join(routeFilePath, "..")), basename(routeFilePath));
  const hydrateEntry = generateHydrateEntry(routeRel, islandNames);
  const entryPath = join(outdir, `${entryId}.tsx`);
  writeFileSync(entryPath, hydrateEntry, "utf-8");

  const result = Bun.spawnSync([
    "bun",
    "build",
    "--target=browser",
    "--external",
    "react",
    "--external",
    "react-dom",
    "--outdir",
    outdir,
    entryPath,
  ]);

  if (result.success) {
    return [`/_islands/${entryId}/${entryId}.js`];
  }

  writeFileSync(bundlePath, generateFallbackHydration(islandNames), "utf-8");
  return [`/_islands/${entryId}/${entryId}.js`];
}

function generateHydrateEntry(routeRelPath: string, islandNames: string[]): string {
  return `import * as Route from "${routeRelPath}";

document.querySelectorAll("[data-island]").forEach((el) => {
  const name = el.getAttribute("data-island");
  if (!name) return;
  const Component = Route.islands?.[name];
  if (!Component) return;
  const root = ReactDOM.hydrateRoot(el, React.createElement(Component));
});
`;
}

function generateFallbackHydration(islandNames: string[]): string {
  return `// x island hydration fallback — ${islandNames.join(", ")}
document.querySelectorAll("[data-island]").forEach(function(el) {
  el.setAttribute("data-island-hydrated", "false");
});
`;
}

function renderPageWithLayout(
  Component: ComponentType<{ params: Record<string, string> }>,
  params: Record<string, string>,
  layoutModules: ComponentType<{ children: ReactNode }>[],
): ReactNode {
  let content: ReactNode = createElement(Component, { params });
  for (const Layout of layoutModules) {
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

function buildServerEntry(pages: LoadedPage[], apiRoutes: RouteEntry[]): string {
  const pageImports = pages.map((p, i) => `import Page${i} from "${p.entry.filePath}";`).join("\n");

  const apiImports = apiRoutes
    .map((r, i) => `import * as Api${i} from "${r.filePath}";`)
    .join("\n");

  const pageRoutes = pages.map((p, i) => `  "${p.entry.routePath}": Page${i}`).join(",\n");

  const apiEntries = apiRoutes
    .map(
      (r, i) =>
        `  "${r.routePath}": { GET: Api${i}.GET, POST: Api${i}.POST, PUT: Api${i}.PUT, PATCH: Api${i}.PATCH, DELETE: Api${i}.DELETE }`,
    )
    .join(",\n");

  const handleApiCode = [
    "export async function handleApiRoute(req: Request): Promise<Response | null> {",
    "  const url = new URL(req.url);",
    "  for (const [routePath, handlers] of Object.entries(apiRoutes)) {",
    "    const escaped = routePath.replace(/[.+?^${}()|[\\]\\\\]/g, '\\\\$&').replace(/:\\\\w+/g, '([^/]+)').replace(/\\\\\\*/g, '(.+)');",
    "    const pattern = new RegExp('^' + escaped + '$');",
    "    if (pattern.test(url.pathname)) {",
    "      const handler = handlers[req.method];",
    "      if (handler) return await handler(req);",
    "      return new Response('Method not allowed', { status: 405 });",
    "    }",
    "  }",
    "  return null;",
    "}",
  ].join("\n");

  return [
    "// Auto-generated by @x/core build",
    pageImports,
    apiImports,
    "",
    "export const routes = {",
    pageRoutes,
    "};",
    "",
    "export const apiRoutes: Record<string, Record<string, (req: Request) => Response | Promise<Response>>> = {",
    apiEntries,
    "};",
    "",
    handleApiCode,
  ].join("\n");
}

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
