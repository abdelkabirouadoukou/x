import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type ComponentType, type ReactNode, createElement } from "react";
import { type ContentEntry, scanContent } from "./content";
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

    const page: LoadedPage = { entry, mode, Component, layoutModules };

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

    if (registry.entries.length > 0) {
      for (const island of registry.entries) {
        const clientJs = buildIslandBundle(island.name, page.entry.filePath);
        const islandDir = join(islandsDir, island.name);
        mkdirSync(islandDir, { recursive: true });
        writeFileSync(join(islandDir, `${island.id}.js`), clientJs, "utf-8");
      }
      console.log(`  [islands] ${registry.entries.length} island(s) on ${page.entry.routePath}`);
    }

    writeFileSync(fullPath, html, "utf-8");
    console.log(`  [static] ${page.entry.routePath} -> ${outPath}`);
  }

  for (const content of contentEntries) {
    const registry = createIslandRegistry();
    const pageContent = createElement(StaticContentPage, { content });
    const rendered = createElement(IslandProvider, { registry }, pageContent);
    const html = renderStaticPage(rendered, {
      title: (content.frontmatter.title as string) ?? content.slug,
    });

    const outPath = content.routePath === "/" ? "/index.html" : `${content.routePath}/index.html`;
    const fullPath = join(clientDir, outPath);
    mkdirSync(join(fullPath, ".."), { recursive: true });
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

  console.log(`[x] build complete -> ${outDir}`);
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

function StaticContentPage({ content }: { content: ContentEntry }) {
  return createElement(
    "article",
    null,
    content.frontmatter.title
      ? createElement("h1", null, content.frontmatter.title as string)
      : null,
    createElement("div", {
      // biome-ignore lint/security/noDangerouslySetInnerHtml: content body is markdown rendered as HTML
      dangerouslySetInnerHTML: { __html: content.body },
    }),
  );
}

function buildIslandBundle(name: string, _routePath: string): string {
  return `// Island: ${name}
const islands = document.querySelectorAll('[data-island="${name}"]');
for (const el of islands) {
  // Hydrate island component here
  // In production, this would import the actual component module
  console.log('[x] hydrate island:', el.dataset.islandId);
}
`;
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
