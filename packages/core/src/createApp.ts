import { type FSWatcher, readFileSync, watch } from "node:fs";
import { join } from "node:path";
import { type ComponentType, type ReactNode, createElement } from "react";
import type { RouteMode } from "./build";
import { type ContentEntry, renderMarkdown, scanContent } from "./content";
import { renderPage } from "./render";
import {
  type LayoutEntry,
  type RouteEntry,
  extractParams,
  findLayoutChain,
  scanLayouts,
  scanRoutes,
  writeManifest,
} from "./router";

export interface RouteProps {
  params: Record<string, string>;
}

export interface CreateAppOptions {
  routesDir: string;
  contentDir?: string;
  port?: number;
  development?: boolean;
}

export interface AppServeOptions {
  routes: Record<string, (req: Request) => Promise<Response> | Response>;
  development: boolean;
  port: number;
  fetch: (req: Request) => Response | Promise<Response>;
}

interface RouteHandler {
  entry: RouteEntry;
  mode: RouteMode;
  handler: (req: Request) => Promise<Response>;
}

interface ContentHandler {
  entry: ContentEntry;
  handler: (req: Request) => Promise<Response>;
}

function wrapWithLayouts(
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

function renderContentPage(content: ContentEntry): string {
  const title = (content.frontmatter.title as string) ?? content.slug;
  const bodyHtml = renderMarkdown(content.body);
  const body = renderPage(
    createElement(
      "article",
      null,
      content.frontmatter.title
        ? createElement("h1", null, content.frontmatter.title as string)
        : null,
      createElement("div", {
        // biome-ignore lint/security/noDangerouslySetInnerHtml: body is markdown rendered to HTML
        dangerouslySetInnerHTML: { __html: bodyHtml },
      }),
    ),
    { title },
  );
  return body;
}

export async function createApp(options: CreateAppOptions): Promise<AppServeOptions> {
  let handlers: RouteHandler[] = [];
  let contentHandlers: ContentHandler[] = [];

  async function buildHandlers(): Promise<void> {
    const found = scanRoutes(options.routesDir);
    const layouts = scanLayouts(options.routesDir);

    if (options.development) {
      writeManifest(found, options.routesDir);
    }

    const loaded: RouteHandler[] = [];
    for (const route of found) {
      const mod = (await import(route.filePath)) as {
        default?: ComponentType<RouteProps>;
        mode?: RouteMode;
      };
      const Component = mod.default;
      if (!Component) {
        console.warn(`[x] ${route.filePath} has no default export -- skipping`);
        continue;
      }

      const mode = mod.mode ?? "server";
      const layoutChain = findLayoutChain(route.filePath, layouts, options.routesDir);
      const layoutModules: ComponentType<{ children: ReactNode }>[] = [];
      for (const l of layoutChain) {
        const layoutMod = (await import(l.filePath)) as {
          default?: ComponentType<{ children: ReactNode }>;
        };
        if (layoutMod.default) layoutModules.push(layoutMod.default);
      }

      loaded.push({
        entry: route,
        mode,
        handler: async (req: Request) => {
          const params =
            extractParams(route.routePath, route.paramNames, new URL(req.url).pathname) ?? {};
          const content = wrapWithLayouts(Component, params, layoutModules);
          const html = renderPage(content);
          return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        },
      });
    }

    handlers = loaded;

    if (options.contentDir) {
      const content = scanContent(options.contentDir);
      const loadedContent: ContentHandler[] = content.map((entry) => ({
        entry,
        handler: async () => {
          const html = renderContentPage(entry);
          return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        },
      }));
      contentHandlers = loadedContent;
    }
  }

  await buildHandlers();

  if (options.development) {
    let rebuildTimeout: Timer | null = null;

    function scheduleRebuild() {
      if (rebuildTimeout) clearTimeout(rebuildTimeout);
      rebuildTimeout = setTimeout(async () => {
        const oldPaths = new Set(handlers.map((h) => h.entry.filePath));
        await buildHandlers();
        const newPaths = new Set(handlers.map((h) => h.entry.filePath));

        const added = [...newPaths].filter((p) => !oldPaths.has(p));
        const removed = [...oldPaths].filter((p) => !newPaths.has(p));

        if (added.length > 0) {
          for (const p of added)
            console.log(`[x] route added: ${p.replace(options.routesDir, "")}`);
        }
        if (removed.length > 0) {
          for (const p of removed)
            console.log(`[x] route removed: ${p.replace(options.routesDir, "")}`);
        }

        if (added.length > 0 || removed.length > 0) {
          console.log(
            `[x] route tree rebuilt (${handlers.length} routes, ${contentHandlers.length} content)`,
          );
        }
      }, 200);
    }

    try {
      const watcher = watch(options.routesDir, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        const name = typeof filename === "string" ? filename : (filename as Buffer).toString();
        if (name.startsWith(".") || name.startsWith("_")) return;
        if (!/\.(tsx|ts)$/.test(name)) return;
        scheduleRebuild();
      });
    } catch {
      console.warn("[x] file watching not available on this platform");
    }

    const devFetch = (req: Request) => {
      const url = new URL(req.url).pathname;

      for (const h of handlers) {
        const params = extractParams(h.entry.routePath, h.entry.paramNames, url);
        if (params !== null) {
          return h.handler(req);
        }
      }

      for (const h of contentHandlers) {
        if (h.entry.routePath === url) {
          return h.handler(req);
        }
      }

      return new Response("Not found", { status: 404 });
    };

    return {
      routes: {},
      development: true,
      port: options.port ?? 3000,
      fetch: devFetch,
    };
  }

  const routeMap: Record<string, (req: Request) => Promise<Response> | Response> = {};
  for (const h of handlers) {
    routeMap[h.entry.routePath] = h.handler;
  }

  return {
    routes: routeMap,
    development: false,
    port: options.port ?? 3000,
    fetch: () => new Response("Not found", { status: 404 }),
  };
}
