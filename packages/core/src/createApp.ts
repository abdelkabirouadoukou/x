import { type ComponentType, createElement } from "react";
import { renderPage } from "./render";
import { scanRoutes } from "./router";

export interface RouteProps {
  params: Record<string, string>;
}

export interface CreateAppOptions {
  /** Absolute path to the routes directory, e.g. `${import.meta.dir}/routes` */
  routesDir: string;
  port?: number;
  development?: boolean;
}

export interface AppServeOptions {
  routes: Record<string, (req: Request) => Promise<Response> | Response>;
  development: boolean;
  port: number;
  fetch: (req: Request) => Response;
}

/**
 * Loads every route module under `routesDir` and returns an object shaped
 * for `Bun.serve()`. Each route module must have a default export that's a
 * React component; it's rendered server-side on every request.
 *
 * This is deliberately the simplest possible version (always SSR, no static
 * generation, no islands yet) — Phase 1/3 of TASKS.md. Static generation and
 * islands build on top of the same `scanRoutes` + `renderPage` primitives.
 */
export async function createApp(options: CreateAppOptions): Promise<AppServeOptions> {
  const found = scanRoutes(options.routesDir);
  const routes: AppServeOptions["routes"] = {};

  for (const route of found) {
    const mod = (await import(route.filePath)) as { default?: ComponentType<RouteProps> };
    const Component = mod.default;

    if (!Component) {
      console.warn(`[x] ${route.filePath} has no default export — skipping`);
      continue;
    }

    routes[route.routePath] = (req: Request) => {
      const params = (req as Request & { params?: Record<string, string> }).params ?? {};
      const html = renderPage(createElement(Component, { params }));
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    };
  }

  return {
    routes,
    development: options.development ?? false,
    port: options.port ?? 3000,
    fetch: () => new Response("Not found", { status: 404 }),
  };
}
