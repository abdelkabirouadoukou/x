import { type FSWatcher, watch } from "node:fs";
import { join } from "node:path";
import { type ComponentType, type ReactNode, createElement } from "react";
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
  handler: (req: Request) => Promise<Response>;
}

export async function createApp(options: CreateAppOptions): Promise<AppServeOptions> {
  let handlers: RouteHandler[] = [];

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
      };
      const Component = mod.default;
      if (!Component) {
        console.warn(`[x] ${route.filePath} has no default export -- skipping`);
        continue;
      }

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
        handler: async (req: Request) => {
          const params =
            extractParams(route.routePath, route.paramNames, new URL(req.url).pathname) ?? {};
          let content: ReactNode = createElement(Component, { params });
          for (const Layout of layoutModules) {
            content = createElement(Layout, null, content);
          }
          const html = renderPage(content);
          return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        },
      });
    }

    handlers = loaded;
  }

  await buildHandlers();

  if (options.development) {
    let watcher: FSWatcher | null = null;
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
          console.log(`[x] route tree rebuilt (${handlers.length} routes)`);
        }
      }, 200);
    }

    try {
      watcher = watch(options.routesDir, { recursive: true }, (_eventType, filename) => {
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
