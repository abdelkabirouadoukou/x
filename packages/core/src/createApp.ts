import { type FSWatcher, watch } from "node:fs";
import { join } from "node:path";
import { type ComponentType, type ReactNode, createElement } from "react";
import type { RouteMode } from "./build";
import { type ContentEntry, renderMarkdown, scanContent } from "./content";
import { type MiddlewareFn, composeMiddleware } from "./middleware";
import type { LoaderArgs, LoaderReturn } from "./render";
import { renderPage, renderStreamingPage } from "./render";
import {
  type LayoutEntry,
  type RouteEntry,
  extractParams,
  findLayoutChain,
  findMiddlewareChain,
  scanLayouts,
  scanMiddleware,
  scanRoutes,
  writeManifest,
} from "./router";
import { getServerFunctionHandler, registerServerFunctions, resetServerFunctions } from "./server-functions";

export interface RouteProps {
  params: Record<string, string>;
  loaderData?: Record<string, unknown>;
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

export interface RevalidateOptions {
  revalidate?: number;
}

interface StaticCacheEntry {
  html: string;
  timestamp: number;
}

interface RouteHandler {
  entry: RouteEntry;
  mode: RouteMode;
  revalidate: number | undefined;
  handler: (req: Request) => Promise<Response>;
}

interface ContentHandler {
  entry: ContentEntry;
  handler: (req: Request) => Promise<Response>;
}

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function wrapWithLayouts(
  Component: ComponentType<RouteProps>,
  params: Record<string, string>,
  loaderData: Record<string, unknown>,
  layoutModules: ComponentType<{ children: ReactNode }>[],
): ReactNode {
  let content: ReactNode = createElement(Component, { params, loaderData });
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
  const serverFnHandler = getServerFunctionHandler();
  const staticCache = new Map<string, StaticCacheEntry>();

  async function buildHandlers(): Promise<void> {
    resetServerFunctions();
    const found = scanRoutes(options.routesDir);
    const layouts = scanLayouts(options.routesDir);
    const middlewareEntries = scanMiddleware(options.routesDir);

    if (options.development) {
      writeManifest(found, options.routesDir);
    }

    const loaded: RouteHandler[] = [];
    for (const route of found) {
      const mod = (await import(route.filePath)) as Record<string, unknown>;

      if (route.isApi) {
        const methodHandlers: Record<string, (req: Request) => unknown> = {};
        for (const method of HTTP_METHODS) {
          if (typeof mod[method] === "function") {
            methodHandlers[method] = mod[method] as (req: Request) => unknown;
          }
        }

        const actions = mod.actions as Record<string, (...args: unknown[]) => Promise<unknown>> | undefined;
        if (actions) {
          registerServerFunctions(route.routePath, route.paramNames, actions);
        }

        loaded.push({
          entry: route,
          mode: "server",
          revalidate: undefined,
          handler: async (req: Request) => {
            const method = req.method;
            const handlerFn = methodHandlers[method];
            if (handlerFn) {
              const result = await handlerFn(req);
              if (result instanceof Response) return result;
              if (result === undefined || result === null) {
                return new Response("OK", { status: 200 });
              }
              return Response.json(result);
            }
            return new Response(`Method ${method} not allowed`, { status: 405 });
          },
        });
        continue;
      }

      const Component = mod.default as ComponentType<RouteProps> | undefined;
      if (!Component) {
        console.warn(`[x] ${route.filePath} has no default export -- skipping`);
        continue;
      }

      const mode = (mod.mode as RouteMode) ?? "server";
      const loader = mod.loader as ((args: LoaderArgs) => Promise<LoaderReturn>) | undefined;
      const routeMiddleware = mod.middleware as MiddlewareFn | undefined;
      const revalidate = mod.revalidate as number | undefined;

      const actions = mod.actions as Record<string, (...args: unknown[]) => Promise<unknown>> | undefined;
      if (actions) {
        registerServerFunctions(route.routePath, route.paramNames, actions);
      }

      const layoutChain = findLayoutChain(route.filePath, layouts, options.routesDir);
      const layoutModules: ComponentType<{ children: ReactNode }>[] = [];
      for (const l of layoutChain) {
        const layoutMod = (await import(l.filePath)) as {
          default?: ComponentType<{ children: ReactNode }>;
        };
        if (layoutMod.default) layoutModules.push(layoutMod.default);
      }

      const mwChain = findMiddlewareChain(route.filePath, middlewareEntries, options.routesDir);
      const middlewareModules: MiddlewareFn[] = [];
      for (const m of mwChain) {
        const mwMod = (await import(m.filePath)) as {
          middleware?: MiddlewareFn;
        };
        if (typeof mwMod.middleware === "function") {
          middlewareModules.push(mwMod.middleware);
        }
      }
      if (routeMiddleware) {
        middlewareModules.push(routeMiddleware);
      }

      loaded.push({
        entry: route,
        mode,
        revalidate,
        handler: async (req: Request) => {
          const params =
            extractParams(route.routePath, route.paramNames, new URL(req.url).pathname) ?? {};

          const baseHandler = async (ctx: {
            params: Record<string, string>;
            request: Request;
          }) => {
            let loaderData: Record<string, unknown> = {};
            if (loader) {
              const result = await loader(ctx);
              if (result instanceof Response) return result;
              loaderData = result;
            }

            if (mode === "server") {
              const content = wrapWithLayouts(Component, ctx.params, loaderData, layoutModules);
              const stream = await renderStreamingPage(content);
              return new Response(stream, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
              });
            }

            const cached = staticCache.get(route.routePath);
            const revalidateSeconds = revalidate ?? 0;

            if (
              revalidateSeconds > 0 &&
              cached &&
              Date.now() - cached.timestamp < revalidateSeconds * 1000
            ) {
              return new Response(cached.html, {
                headers: { "Content-Type": "text/html; charset=utf-8", "X-Revalidated": "hit" },
              });
            }

            const content = wrapWithLayouts(Component, ctx.params, loaderData, layoutModules);
            const html = renderPage(content);

            if (revalidateSeconds > 0) {
              staticCache.set(route.routePath, { html, timestamp: Date.now() });
            }

            return new Response(html, {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "X-Revalidated": revalidateSeconds > 0 ? "miss" : "none",
              },
            });
          };

          if (middlewareModules.length > 0) {
            const composed = composeMiddleware(middlewareModules, baseHandler);
            return composed(
              { params, request: req },
              async () => new Response("Not found", { status: 404 }),
            );
          }

          return baseHandler({ params, request: req });
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

  async function handleRevalidation(req: Request): Promise<Response | null> {
    if (new URL(req.url).pathname !== "/__x/revalidate") return null;
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const body = (await req.json()) as { path?: string };
    if (body.path) {
      staticCache.delete(body.path);
      return new Response(`Revalidated: ${body.path}`);
    }
    staticCache.clear();
    return new Response("Revalidated all");
  }

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

    const devFetch = async (req: Request) => {
      const url = new URL(req.url).pathname;

      const revalidationResult = await handleRevalidation(req);
      if (revalidationResult !== null) return revalidationResult;

      const serverFnResult = await serverFnHandler(req);
      if (serverFnResult !== null) return serverFnResult;

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
    fetch: async (req: Request) => {
      const revalidationResult = await handleRevalidation(req);
      if (revalidationResult !== null) return revalidationResult;

      const result = await serverFnHandler(req);
      if (result !== null) return result;
      return new Response("Not found", { status: 404 });
    },
  };
}
