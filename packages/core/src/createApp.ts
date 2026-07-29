import { type FSWatcher, existsSync, watch } from "node:fs";
import { join, resolve, sep } from "node:path";
import { type ComponentType, type ReactNode, createElement } from "react";
import type { RouteMode } from "./build";
import { type ContentEntry, renderMarkdown, scanContent } from "./content";
import { renderErrorOverlay } from "./error-overlay";
import { type MiddlewareFn, composeMiddleware } from "./middleware";
import DefaultNotFound from "./not-found";
import type { LoaderArgs, LoaderReturn } from "./render";
import { renderPage, renderStreamingPage } from "./render";
import {
  type LayoutEntry,
  type NotFoundEntry,
  type RouteEntry,
  extractParams,
  findLayoutChain,
  findMiddlewareChain,
  scanApiDir,
  scanLayouts,
  scanLayoutsDir,
  scanMiddleware,
  scanNotFound,
  scanPages,
  scanRoutes,
  writeManifest,
} from "./router";
import {
  getServerFunctionHandler,
  registerServerFunctions,
  resetServerFunctions,
} from "./server-functions";
import { createHealthCheckHandler, type HealthCheckOptions } from "./observability/health";
import { withRequestLogging } from "./observability/logger";
import { type ErrorReporter, reportException, setErrorReporter } from "./observability/monitoring";
import { type CsrfOptions } from "./security/csrf";
import { applySecurityHeaders, type SecurityHeadersOptions } from "./security/headers";
import { createRateLimiter, rateLimitMiddleware, type RateLimitOptions } from "./security/rate-limit";

export interface RouteProps {
  params: Record<string, string>;
  loaderData?: Record<string, unknown>;
}

export interface CreateAppOptions {
  /** Primary route directory (legacy — mixes pages, api, layouts together). */
  routesDir?: string;
  /** Separate directory for page routes (preferred over routesDir when set). */
  pagesDir?: string;
  /** Separate directory for API routes. Defaults to routesDir/api if not set. */
  apiDir?: string;
  /** Separate directory for layout wrappers. */
  layoutsDir?: string;
  contentDir?: string;
  actionsDir?: string;
  port?: number;
  development?: boolean;
  security?: {
    /** CSRF protection for /__x/actions/* requests. Origin/Referer verification is always on unless disabled. */
    csrf?: CsrfOptions;
    /** Security response headers (CSP, HSTS, X-Frame-Options, ...). Pass false to disable entirely. */
    headers?: SecurityHeadersOptions | false;
    /** Rate limiting applied ahead of all routing. Pass false to disable entirely. */
    rateLimit?: RateLimitOptions | false;
  };
  observability?: {
    /** Structured JSON request logging. Default: true. */
    logging?: boolean;
    /** Plugin hook for exceptions during SSR/actions/API — see createSentryReporter/createOtelReporter. */
    errorReporter?: ErrorReporter;
    /** /healthz and /readyz endpoints, served ahead of all other routing. */
    health?: HealthCheckOptions;
  };
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

function projectRootFromRoutesDir(routesDir: string): string {
  return join(routesDir, "..", "..");
}

function resolvePublicAsset(publicDir: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const target = resolve(join(publicDir, decoded));
  const root = resolve(publicDir);
  if (target !== root && !target.startsWith(root + sep)) return null;
  return target;
}

async function serveStaticAsset(publicDir: string | null, req: Request): Promise<Response | null> {
  if (!publicDir) return null;
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  const pathname = new URL(req.url).pathname;
  if (pathname === "/" || pathname.endsWith("/")) return null;
  const filePath = resolvePublicAsset(publicDir, pathname);
  if (!filePath) return null;
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  return new Response(file);
}

function wrapWithLayouts(
  Component: ComponentType<RouteProps>,
  params: Record<string, string>,
  loaderData: Record<string, unknown>,
  layoutModules: ComponentType<{ children: ReactNode }>[],
): ReactNode {
  let content: ReactNode = createElement(Component, { params, loaderData });
  for (const Layout of [...layoutModules].reverse()) {
    content = createElement(Layout, null, content);
  }
  return content;
}

function renderContentPage(
  content: ContentEntry,
  stylesheet: string | undefined,
  dev = false,
): string {
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
    { title, stylesheet, liveReload: dev },
  );
  return body;
}

export function defineConfig(config: CreateAppOptions): CreateAppOptions {
  return config;
}

function importDev(path: string, dev: boolean): Promise<Record<string, unknown>> {
  return import(dev ? `${path}?t=${Date.now()}` : path);
}

export async function createApp(options: CreateAppOptions): Promise<AppServeOptions> {
  const dev = options.development ?? false;
  const primaryDir: string = options.pagesDir || options.routesDir || "src/pages";
  let handlers: RouteHandler[] = [];
  let contentHandlers: ContentHandler[] = [];
  let publicDir: string | null = null;
  let stylesheetHref: string | undefined;
  let notFoundComponent: ComponentType<RouteProps> = DefaultNotFound;
  let notFoundLayout: ComponentType<{ children: ReactNode }> | undefined;
  const serverFnHandler = getServerFunctionHandler(options.security?.csrf);
  const staticCache = new Map<string, StaticCacheEntry>();

  if (options.observability?.errorReporter) {
    setErrorReporter(options.observability.errorReporter);
  }
  const healthHandler = createHealthCheckHandler(options.observability?.health ?? {});
  const rateLimiter =
    options.security?.rateLimit === false ? null : createRateLimiter(options.security?.rateLimit ?? {});
  const securityHeadersOptions = options.security?.headers;
  const loggingEnabled = options.observability?.logging ?? true;

  function withResponseHardening(res: Response): Response {
    return securityHeadersOptions === false ? res : applySecurityHeaders(res, securityHeadersOptions);
  }

  async function renderNotFound(req?: Request): Promise<Response> {
    const content = notFoundLayout
      ? createElement(notFoundLayout, null, createElement(notFoundComponent, { params: {} }))
      : createElement(notFoundComponent, { params: {} });
    const html = renderPage(content, {
      title: "404 — Not Found",
      stylesheet: stylesheetHref,
      liveReload: dev,
    });
    return new Response(html, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  async function buildHandlers(): Promise<void> {
    resetServerFunctions();
    const pagesDir: string = primaryDir;
    const apiDir: string | undefined = options.apiDir;
    const layoutsDir: string = options.layoutsDir || pagesDir;

    let found: RouteEntry[] = scanPages(pagesDir);

    const apiFound: RouteEntry[] = [];
    if (apiDir && existsSync(apiDir)) {
      apiFound.push(...scanApiDir(apiDir));
    }
    const legacyApiDir = join(pagesDir, "api");
    if (existsSync(legacyApiDir) && legacyApiDir !== apiDir) {
      apiFound.push(...scanApiDir(legacyApiDir));
    }
    found = found.filter((r) => !r.isApi);
    found.push(...apiFound);

    // Layouts: dedicated layouts dir (any .tsx/.ts file) + nested _layout.tsx
    // inside pages/ for directory-level nesting.
    const dedicatedLayouts = options.layoutsDir ? scanLayoutsDir(options.layoutsDir) : [];
    const nestedLayouts = scanLayouts(pagesDir);
    const layouts = [...dedicatedLayouts, ...nestedLayouts];
    const middlewareEntries = scanMiddleware(pagesDir);

    // Scan action files from a separate actionsDir if provided
    if (options.actionsDir) {
      const actionFiles = scanRoutes(options.actionsDir);
      for (const actionFile of actionFiles) {
        const mod = (await importDev(actionFile.filePath, dev)) as Record<string, unknown>;

        // Derive parent-level route path: strip the file-name segment so that a
        // file named greet.ts exposes actions under the parent directory's path.
        // e.g. src/actions/dashboard/greet.ts -> routePath /dashboard
        // For index.ts the routePath is already the directory path.
        const segments = actionFile.routePath.split("/").filter(Boolean);
        const fileName = segments[segments.length - 1] ?? "";
        const parentPath =
          fileName === "index" || !fileName
            ? actionFile.routePath
            : `/${segments.slice(0, -1).join("/")}`;

        // `export const actions = { greet }` — batched registration
        const actions = mod.actions as
          | Record<string, (...args: unknown[]) => Promise<unknown>>
          | undefined;
        if (actions) {
          registerServerFunctions(parentPath, actionFile.paramNames, actions);
        }
        // Individual named exports — each function is an action under parent path
        for (const [key, value] of Object.entries(mod)) {
          if (key === "default" || key === "actions" || typeof value !== "function") continue;
          registerServerFunctions(parentPath, actionFile.paramNames, {
            [key]: value as (...args: unknown[]) => Promise<unknown>,
          });
        }
      }
    }

    const projectRoot = projectRootFromRoutesDir(pagesDir);
    const candidatePublicDir = join(projectRoot, "public");
    publicDir = existsSync(candidatePublicDir) ? candidatePublicDir : null;
    stylesheetHref =
      publicDir && existsSync(join(publicDir, "styles.css")) ? "/styles.css" : undefined;

    const notFoundEntry = scanNotFound(pagesDir);
    if (notFoundEntry) {
      const mod = (await importDev(notFoundEntry.filePath, dev)) as {
        default?: ComponentType<RouteProps>;
      };
      notFoundComponent = mod.default ?? DefaultNotFound;
    } else {
      notFoundComponent = DefaultNotFound;
    }
    const rootLayout = layouts.find((l) => l.dirPath === pagesDir);
    if (rootLayout) {
      const layoutMod = (await importDev(rootLayout.filePath, dev)) as {
        default?: ComponentType<{ children: ReactNode }>;
      };
      notFoundLayout = layoutMod.default;
    } else {
      notFoundLayout = undefined;
    }

    if (options.development) {
      writeManifest(found, pagesDir);
    }

    const loaded: RouteHandler[] = [];
    for (const route of found) {
      const mod = (await importDev(route.filePath, dev)) as Record<string, unknown>;

      if (route.isApi) {
        const methodHandlers: Record<string, (req: Request) => unknown> = {};
        for (const method of HTTP_METHODS) {
          if (typeof mod[method] === "function") {
            methodHandlers[method] = mod[method] as (req: Request) => unknown;
          }
        }

        const actions = mod.actions as
          | Record<string, (...args: unknown[]) => Promise<unknown>>
          | undefined;
        if (actions) {
          registerServerFunctions(route.routePath, route.paramNames, actions);
        }

        loaded.push({
          entry: route,
          mode: "server",
          revalidate: undefined,
          handler: async (req: Request) => {
            try {
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
            } catch (err) {
              reportException(err, { route: route.routePath, phase: "api" });
              console.error("[x] API handler error:", err);
              if (options.development) {
                return new Response(renderErrorOverlay(err), {
                  status: 500,
                  headers: { "Content-Type": "text/html; charset=utf-8" },
                });
              }
              return new Response("Internal server error", { status: 500 });
            }
          },
        });
        continue;
      }

      // Register server functions BEFORE the no-default-export check so that
      // action-only files (e.g. greet.ts with `export const actions = {...}`)
      // still work even though they have no page component.
      const actions = mod.actions as
        | Record<string, (...args: unknown[]) => Promise<unknown>>
        | undefined;
      if (actions) {
        registerServerFunctions(route.routePath, route.paramNames, actions);
      }

      const Component = mod.default as ComponentType<RouteProps> | undefined;
      if (!Component) {
        // Only warn for non-API, non-action files. Action-only files are fine.
        if (!actions) {
          console.warn(`[x] ${route.filePath} has no default export -- skipping`);
        }
        continue;
      }

      const mode = (mod.mode as RouteMode) ?? "server";
      const loader = mod.loader as ((args: LoaderArgs) => Promise<LoaderReturn>) | undefined;
      const routeMiddleware = mod.middleware as MiddlewareFn | undefined;
      const revalidate = mod.revalidate as number | undefined;

      const layoutChain = findLayoutChain(route.filePath, layouts, pagesDir);
      // Prepend root layouts from the dedicated layouts dir
      for (const rootLayout of dedicatedLayouts) {
        if (!layoutChain.some((l) => l.filePath === rootLayout.filePath)) {
          layoutChain.unshift(rootLayout);
        }
      }
      const layoutModules: ComponentType<{ children: ReactNode }>[] = [];
      for (const l of layoutChain) {
        const layoutMod = (await importDev(l.filePath, dev)) as {
          default?: ComponentType<{ children: ReactNode }>;
        };
        if (layoutMod.default) layoutModules.push(layoutMod.default);
      }

      const mwChain = findMiddlewareChain(route.filePath, middlewareEntries, pagesDir);
      const middlewareModules: MiddlewareFn[] = [];
      for (const m of mwChain) {
        const mwMod = (await importDev(m.filePath, dev)) as {
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
          try {
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
                const stream = await renderStreamingPage(content, {
                  stylesheet: stylesheetHref,
                  liveReload: dev,
                });
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
              const html = renderPage(content, { stylesheet: stylesheetHref, liveReload: dev });

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
          } catch (err) {
            reportException(err, { route: route.routePath, phase: "ssr" });
            console.error("[x] route handler error:", err);
            if (options.development) {
              return new Response(renderErrorOverlay(err), {
                status: 500,
                headers: { "Content-Type": "text/html; charset=utf-8" },
              });
            }
            return new Response("Internal server error", { status: 500 });
          }
        },
      });
    }

    handlers = loaded;

    if (options.contentDir) {
      const content = scanContent(options.contentDir);
      const loadedContent: ContentHandler[] = content.map((entry) => ({
        entry,
        handler: async () => {
          const html = renderContentPage(entry, stylesheetHref, dev);
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
    const sseClients = new Set<(event: string, data: string) => void>();

    function notifyClients() {
      for (const send of sseClients) {
        try {
          send("reload", "");
        } catch {
          sseClients.delete(send);
        }
      }
    }

    function scheduleRebuild() {
      if (rebuildTimeout) clearTimeout(rebuildTimeout);
      rebuildTimeout = setTimeout(async () => {
        try {
          const oldPaths = new Set(handlers.map((h) => h.entry.filePath));
          await buildHandlers();
          const newPaths = new Set(handlers.map((h) => h.entry.filePath));

          const added = [...newPaths].filter((p) => !oldPaths.has(p));
          const removed = [...oldPaths].filter((p) => !newPaths.has(p));

          if (added.length > 0) {
            for (const p of added) console.log(`[x] route added: ${p.replace(primaryDir, "")}`);
          }
          if (removed.length > 0) {
            for (const p of removed) console.log(`[x] route removed: ${p.replace(primaryDir, "")}`);
          }

          if (added.length > 0 || removed.length > 0) {
            console.log(
              `[x] route tree rebuilt (${handlers.length} routes, ${contentHandlers.length} content)`,
            );
          }

          notifyClients();
        } catch {
          if (options.development) {
            console.warn("[x] rebuild skipped: routes directory may have changed");
          }
        }
      }, 200);
    }

    try {
      const srcDir = join(primaryDir, "..", "..", "src");
      const watchDirs = [
        ...new Set(
          [primaryDir, options.apiDir, options.layoutsDir, options.actionsDir, srcDir].filter(
            Boolean,
          ),
        ),
      ] as string[];
      for (const dir of watchDirs) {
        watch(dir, { recursive: true }, (_eventType: unknown, filename: unknown) => {
          if (!filename) return;
          const name = typeof filename === "string" ? filename : (filename as Buffer).toString();
          if (name.startsWith(".") || name.startsWith("_")) return;
          if (name === "x-routes.ts") return;
          if (!/\.(tsx|ts|css)$/.test(name)) return;
          scheduleRebuild();
        });
      }
    } catch {
      console.warn("[x] file watching not available on this platform");
    }

    const devFetchInner = async (req: Request) => {
      const url = new URL(req.url).pathname;

      const healthResult = await healthHandler(req);
      if (healthResult !== null) return healthResult;

      if (rateLimiter) {
        const limited = rateLimitMiddleware(rateLimiter, req);
        if (limited !== null) return limited;
      }

      if (url === "/__x/reload") {
        const body = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode("event: hb\ndata: \n\n"));
            const send = (event: string, data: string) => {
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
            };
            sseClients.add(send);
            req.signal.addEventListener("abort", () => sseClients.delete(send));
          },
        });
        return new Response(body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      const revalidationResult = await handleRevalidation(req);
      if (revalidationResult !== null) return revalidationResult;

      const serverFnResult = await serverFnHandler(req);
      if (serverFnResult !== null) return serverFnResult;

      const staticAsset = await serveStaticAsset(publicDir, req);
      if (staticAsset !== null) return staticAsset;

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

      return renderNotFound(req);
    };

    const devFetchHardened = async (req: Request) => withResponseHardening(await devFetchInner(req));
    const devFetch = loggingEnabled ? withRequestLogging(devFetchHardened) : devFetchHardened;

    return {
      routes: {},
      development: true,
      port: options.port ?? 3000,
      fetch: devFetch,
    };
  }

  // Production -- same iteration logic as dev, so dynamic routes, layouts,
  // middleware, static assets and 404 page all work identically.
  const prodFetchInner = async (req: Request) => {
    const url = new URL(req.url).pathname;

    const healthResult = await healthHandler(req);
    if (healthResult !== null) return healthResult;

    if (rateLimiter) {
      const limited = rateLimitMiddleware(rateLimiter, req);
      if (limited !== null) return limited;
    }

    const revalidationResult = await handleRevalidation(req);
    if (revalidationResult !== null) return revalidationResult;

    const serverFnResult = await serverFnHandler(req);
    if (serverFnResult !== null) return serverFnResult;

    const staticAsset = await serveStaticAsset(publicDir, req);
    if (staticAsset !== null) return staticAsset;

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

    return renderNotFound(req);
  };

  const prodFetchHardened = async (req: Request) => withResponseHardening(await prodFetchInner(req));
  const prodFetch = loggingEnabled ? withRequestLogging(prodFetchHardened) : prodFetchHardened;

  return {
    routes: {},
    development: false,
    port: options.port ?? 3000,
    fetch: prodFetch,
  };
}
