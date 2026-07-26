import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { type ComponentType, type ReactNode, createElement } from "react";
import { type ContentEntry, escapeHtml, renderMarkdown, scanContent } from "./content";
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
  const entriesDir = join(outDir, ".x/entries");

  mkdirSync(clientDir, { recursive: true });
  mkdirSync(serverDir, { recursive: true });
  mkdirSync(islandsDir, { recursive: true });
  mkdirSync(entriesDir, { recursive: true });

  const routeEntries = scanRoutes(options.routesDir);
  const layouts = scanLayouts(options.routesDir);

  const staticPages: LoadedPage[] = [];
  const serverPages: LoadedPage[] = [];

  for (const entry of routeEntries) {
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
      islandScripts = await bundleRouteIslands(page.filePath, uniqueNames, entriesDir, islandsDir);
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

  if (serverPages.length > 0) {
    const serverEntry = buildServerEntry(serverPages);
    const serverEntryPath = join(serverDir, "index.ts");
    writeFileSync(serverEntryPath, serverEntry, "utf-8");
    console.log(
      `  [server] ${serverPages.length} routes -> server/index.ts (bundle with 'bun build')`,
    );
  }

  rmSync(entriesDir, { recursive: true, force: true });
  console.log(`[x] build complete -> ${outDir}`);
}

async function bundleRouteIslands(
  routeFilePath: string,
  islandNames: string[],
  entriesDir: string,
  islandsDir: string,
): Promise<string[]> {
  const entryId = `${basename(routeFilePath).replace(/\.(tsx|ts)$/, "")}-${hash(routeFilePath)}`;
  const entryPath = join(entriesDir, `${entryId}.ts`);
  const entryContent = generateClientEntry(routeFilePath, islandNames);
  writeFileSync(entryPath, entryContent, "utf-8");

  const outdir = join(islandsDir, entryId);
  mkdirSync(outdir, { recursive: true });

  try {
    const proc = Bun.spawn([
      "bun",
      "build",
      entryPath,
      "--outdir",
      outdir,
      "--target",
      "browser",
      "--format",
      "esm",
      "--minify",
    ]);
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      const files = readdirSync(outdir).filter((f) => f.endsWith(".js"));
      return files.map((f) => `/_islands/${entryId}/${f}`);
    }
  } catch {
    // fall through to inline fallback
  }

  const fallbackPath = join(outdir, `${entryId}.js`);
  writeFileSync(fallbackPath, generateInlineIslandFallback(islandNames), "utf-8");
  return [`/_islands/${entryId}/${entryId}.js`];
}

function generateInlineIslandFallback(islandNames: string[]): string {
  return `// x island hydration fallback — ${islandNames.join(", ")}
document.querySelectorAll("[data-island]").forEach(function(el) {
  el.setAttribute("data-island-hydrated", "false");
});
`;
}

function generateClientEntry(routeFilePath: string, islandNames: string[]): string {
  const imports = islandNames
    .map((name) => `const ${name}_mod = () => import("${routeFilePath}");`)
    .join("\n");

  const hydrations = islandNames
    .map(
      (name) => `
  if (mod && mod.islands && mod.islands["${name}"]) {
    const Component = mod.islands["${name}"];
    const els = document.querySelectorAll('[data-island="${name}"]');
    for (const el of els) {
      const root = createRoot(el);
      root.render(createElement(Component));
    }
  }`,
    )
    .join("\n");

  return `// Auto-generated by @x/core build — do not edit
import { createElement } from "react";
import { createRoot } from "react-dom/client";

const load = async () => {
  const mod = await import("${routeFilePath}");
${hydrations}
};

load();
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

function buildServerEntry(pages: LoadedPage[]): string {
  const imports = pages.map((p, i) => `import Page${i} from "${p.entry.filePath}";`).join("\n");

  const routes = pages.map((p, i) => `  "${p.entry.routePath}": Page${i}`).join(",\n");

  return `// Auto-generated by @x/core build
${imports}

export const routes = {
${routes}
};
`;
}

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
