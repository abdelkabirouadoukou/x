import { existsSync, watch } from "node:fs";
import { join, resolve, sep } from "node:path";
import { type ComponentType, createElement, type ReactNode } from "react";
import type { RouteMode } from "./build";
import { type ContentEntry, renderMarkdown, scanContent } from "./content";
import { renderErrorOverlay } from "./error-overlay";
import { createImageProxyHandler, type ImageProxyOptions } from "./images/proxy";
import { createIslandRegistry, type IslandEntry, IslandProvider } from "./island";
import { type ActionModuleInfo, buildIslandBundleInMemory, islandEntryId } from "./island-bundle";
import { composeMiddleware, type MiddlewareFn } from "./middleware";
import DefaultNotFound from "./not-found";
import { createHealthCheckHandler, type HealthCheckOptions } from "./observability/health";
import { withRequestLogging } from "./observability/logger";
import { type MetricsReporter, withRequestMetrics } from "./observability/metrics";
import { type ErrorReporter, reportException, setErrorReporter } from "./observability/monitoring";
import type { LoaderArgs, LoaderReturn } from "./render";
import { renderPage, renderStreamingPage } from "./render";
import {
  extractParams,
  findLayoutChain,
  findMiddlewareChain,
  type RouteEntry,
  scanApiDir,
  scanLayouts,
  scanLayoutsDir,
  scanMiddleware,
  scanNotFound,
  scanPages,
  scanRoutes,
  writeManifest,
} from "./router";
import { type CsrfOptions, checkCsrf } from "./security/csrf";
import { type SecurityHeadersOptions, applySecurityHeaders } from "./security/headers";
import {
  createRateLimiter,
  type RateLimitOptions,
  rateLimitMiddleware,
} from "./security/rate-limit";
import {
  getServerFunctionHandler,
  registerServerFunctions,
  resetServerFunctions,
} from "./server-functions";

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
  /**
   * Resolved stylesheet <link> href (e.g. "/styles.css"), precomputed by the
   * build. Runtimes that can't check the filesystem at request time (Vercel's
   * Node.js functions) rely on this so server-rendered pages still emit the
   * stylesheet tag. When unset, createApp falls back to a runtime probe of
   * `public/styles.css`.
   */
  stylesheetHref?: string;
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
    /**
     * Metrics reporter for request counters/histograms. Pass
     * `createInMemoryMetrics()` (serves `/metrics` in Prometheus text format)
     * or `createOtlpMetricsReporter(meter)`. When set, request metrics are
     * recorded and, if the reporter exposes `handleMetrics`, a `/metrics`
     * endpoint is served ahead of all other routing.
     */
    metrics?: MetricsReporter;
  };
  /** Remote-image proxy at /_x/image?url=... — see ImageProxyOptions. Unset/empty remoteHosts means the route 404s. */
  images?: ImageProxyOptions;
  /**
   * Pre-resolved routes/actions for runtimes that can't scan the filesystem
   * or dynamically `import()` a `.tsx` file at request time (e.g. Vercel's
   * Node.js functions). When set, `createApp` skips all scanning and dynamic
   * imports and builds its handlers straight from this manifest — exactly
   * the same request pipeline (health, rate limit, revalidation, server
   * actions, static assets, islands, image proxy, routing, 404, security
   * headers) as a normally-scanned app.
   */
  preloaded?: PreloadedAppManifest;
}

export interface PreloadedRoute {
  /** Route metadata (path, param names, api flag). */
  entry: RouteEntry;
  mode: RouteMode;
  /** ISR revalidate seconds for static-mode pages. */
  revalidate?: number;
  /** The route's module namespace (default, loader, middleware, actions, GET/POST...). */
  module: Record<string, unknown>;
  layoutModules: ComponentType<{ children: ReactNode }>[];
  middlewareModules: MiddlewareFn[];
  /** Layout source file paths, used as the island-bundle cache key on Bun. */
  layoutFilePaths?: string[];
  /** Pre-resolved island <script> URLs for server-mode pages. When omitted, islands are discovered/bundled at request time (Bun only). */
  islandScripts?: string[];
}

export interface PreloadedAppManifest {
  routes: PreloadedRoute[];
  notFoundComponent?: ComponentType<RouteProps>;
  notFoundLayout?: ComponentType<{ children: ReactNode }>;
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

// Routes are matched in order in the fetch handler, so static (literal)
// routes must sort before dynamic ones — otherwise /posts/[id] would shadow a
// literal /posts/new depending on directory-scan order. Catch-alls go last.
function sortRoutes(handlers: RouteHandler[]): RouteHandler[] {
  return handlers.sort((a, b) => {
    const bp = routeMatchesForSort(b.entry);
    const ap = routeMatchesForSort(a.entry);
    return ap - bp;
  });
}

function routeMatchesForSort(entry: RouteEntry): number {
  const isStatic = entry.paramNames.length === 0;
  const isCatchAll = entry.routePath.includes("*");
  return isStatic ? 0 : isCatchAll ? 2 : 1;
}

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
  // Non-Bun runtimes (e.g. Vercel's Node.js functions) serve static assets
  // from the platform's CDN ahead of the function -- nothing here to do.
  const bun = (globalThis as { Bun?: { file(p: string): { exists(): Promise<boolean> } } }).Bun;
  if (!bun) return null;
  const file = bun.file(filePath);
  if (!(await file.exists())) return null;
  return new Response(file as unknown as BodyInit);
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
  const projectRoot = projectRootFromRoutesDir(primaryDir);
  const resolvedActionsDir =
    options.actionsDir ??
    (existsSync(join(projectRoot, "src", "actions"))
      ? join(projectRoot, "src", "actions")
      : undefined);
  let handlers: RouteHandler[] = [];
  let contentHandlers: ContentHandler[] = [];
  let publicDir: string | null = null;
  let stylesheetHref: string | undefined;
  let notFoundComponent: ComponentType<RouteProps> = DefaultNotFound;
  let notFoundLayout: ComponentType<{ children: ReactNode }> | undefined;
  const serverFnHandler = getServerFunctionHandler(options.security?.csrf);
  const staticCache = new Map<string, StaticCacheEntry>();
  let actionModules = new Map<string, ActionModuleInfo>();
  const islandBundleCache = new Map<string, string[]>();
  const islandFileCache = new Map<string, string>();

  /**
   * Bundles (or reuses a cached bundle of) the islands actually used by a
   * rendered page. `entries` comes from a throwaway discovery render — the
   * same content tree, rendered once to walk the component graph and see
   * which <Island> names got registered, since usage can depend on
   * loaderData. Bundling itself is cached per route file + island-name set,
   * so repeat requests don't re-invoke Bun.build().
   */
  async function resolveIslandScripts(
    routeFilePath: string,
    layoutFilePaths: string[],
    entries: IslandEntry[],
  ): Promise<string[]> {
    if (entries.length === 0) return [];
    const uniqueNames = [...new Set(entries.map((e) => e.name))].sort();
    const cacheKey = `${routeFilePath}::${layoutFilePaths.join("|")}::${uniqueNames.join(",")}`;
    const cached = islandBundleCache.get(cacheKey);
    if (cached) return cached;

    const code = await buildIslandBundleInMemory(
      routeFilePath,
      layoutFilePaths,
      uniqueNames,
      actionModules,
      projectRoot,
    );
    const entryId = islandEntryId(routeFilePath);
    const url = `/_islands/${entryId}/${entryId}.js`;
    islandFileCache.set(url, code);
    const scripts = [url];
    islandBundleCache.set(cacheKey, scripts);
    return scripts;
  }

  function serveIslandBundle(req: Request): Response | null {
    if (req.method !== "GET" && req.method !== "HEAD") return null;
    const pathname = new URL(req.url).pathname;
    if (!pathname.startsWith("/_islands/")) return null;
    const code = islandFileCache.get(pathname);
    if (code === undefined) return null;
    return new Response(code, {
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  if (options.observability?.errorReporter) {
    setErrorReporter(options.observability.errorReporter);
  }
  const healthHandler = createHealthCheckHandler(options.observability?.health ?? {});
  const metricsReporter = options.observability?.metrics;
  const rateLimiter =
    options.security?.rateLimit === false
      ? null
      : createRateLimiter(options.security?.rateLimit ?? {});
  const securityHeadersOptions = options.security?.headers;
  const loggingEnabled = options.observability?.logging ?? true;
  const imageProxyHandler = createImageProxyHandler(options.images);

  function withResponseHardening(res: Response): Response {
    return securityHeadersOptions === false
      ? res
      : applySecurityHeaders(res, securityHeadersOptions);
  }

  async function renderNotFound(_req?: Request): Promise<Response> {
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

  const makeApiHandler =
    (route: RouteEntry, module: Record<string, unknown>): ((req: Request) => Promise<Response>) =>
    async (req: Request) => {
      try {
        const method = req.method;
        const handlerFn = module[method];
        if (typeof handlerFn === "function") {
          const result = await (handlerFn as (r: Request) => unknown)(req);
          if (result instanceof Response) return result;
          if (result === undefined || result === null) {
            return new Response("OK", { status: 200 });
          }
          return Response.json(result);
        }
        return new Response(`Method ${method} not allowed`, { status: 405 });
      } catch (err) {
        reportException(err, { route: route.routePath, phase: "api" });
        metricsReporter?.incr("x_http_errors_total", 1, { phase: "api" });
        console.error("[x] API handler error:", err);
        if (dev) {
          return new Response(renderErrorOverlay(err), {
            status: 500,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        return new Response("Internal server error", { status: 500 });
      }
    };

  const makePageHandler = (opts: {
    route: RouteEntry;
    mode: RouteMode;
    revalidate: number | undefined;
    loader: ((args: LoaderArgs) => Promise<LoaderReturn>) | undefined;
    Component: ComponentType<RouteProps>;
    layoutModules: ComponentType<{ children: ReactNode }>[];
    layoutFilePaths: string[];
    middlewareModules: MiddlewareFn[];
    islandScripts?: string[] | undefined;
  }): ((req: Request) => Promise<Response>) => {
    const {
      route,
      mode,
      revalidate,
      loader,
      Component,
      layoutModules,
      layoutFilePaths,
      middlewareModules,
      islandScripts,
    } = opts;
    return async (req: Request) => {
      try {
        const params =
          extractParams(route.routePath, route.paramNames, new URL(req.url).pathname) ?? {};

const baseHandler = async (ctx: {
          params: Record<string, string>;
          request: Request;
        }) => {
          const cacheKey = new URL(ctx.request.url).pathname;

          if (mode === "server") {
            let loaderData: Record<string, unknown> = {};
            if (loader) {
              const result = await loader(ctx);
              if (result instanceof Response) return result;
              loaderData = result;
            }
            const registry = createIslandRegistry();
            const content = createElement(
              IslandProvider,
              { registry },
              wrapWithLayouts(Component, ctx.params, loaderData, layoutModules),
            );
            let scripts: string[] | undefined = islandScripts;
            if (scripts === undefined) {
              // Cheap discovery render: walks the tree so any <Island> in
              // it registers itself, without committing to a response yet.
              renderPage(content, { stylesheet: stylesheetHref, liveReload: dev });
              scripts = await resolveIslandScripts(
                route.filePath,
                layoutFilePaths,
                registry.entries,
              );
            }

            const stream = await renderStreamingPage(content, {
              stylesheet: stylesheetHref,
              liveReload: dev,
              islandScripts: scripts,
            });
            return new Response(stream, {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }

          const revalidateSeconds = revalidate ?? 0;

          // Cache check happens BEFORE the loader runs: a hit must serve
          // straight from cache without re-executing data fetching. The key
          // is the concrete URL, not the route pattern — otherwise every
          // dynamic path (e.g. /blog/one and /blog/two for [slug].tsx) would
          // share one cache entry and leak content across URLs.
          if (revalidateSeconds > 0) {
            const cached = staticCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < revalidateSeconds * 1000) {
              return new Response(cached.html, {
                headers: {
                  "Content-Type": "text/html; charset=utf-8",
                  "X-Revalidated": "hit",
                },
              });
            }
          }

          let loaderData: Record<string, unknown> = {};
          if (loader) {
            const result = await loader(ctx);
            if (result instanceof Response) return result;
            loaderData = result;
          }

          const registry = createIslandRegistry();
          const content = createElement(
            IslandProvider,
            { registry },
            wrapWithLayouts(Component, ctx.params, loaderData, layoutModules),
          );
          let scripts: string[] | undefined = islandScripts;
          if (scripts === undefined) {
            renderPage(content, { stylesheet: stylesheetHref, liveReload: dev });
            scripts = await resolveIslandScripts(route.filePath, layoutFilePaths, registry.entries);
          }
          const html = renderPage(content, {
            stylesheet: stylesheetHref,
            liveReload: dev,
            islandScripts: scripts,
          });

          if (revalidateSeconds > 0) {
            staticCache.set(cacheKey, { html, timestamp: Date.now() });
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
        metricsReporter?.incr("x_http_errors_total", 1, { phase: "ssr" });
        console.error("[x] route handler error:", err);
        if (dev) {
          return new Response(renderErrorOverlay(err), {
            status: 500,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        return new Response("Internal server error", { status: 500 });
      }
    };
  };

  async function buildHandlers(): Promise<void> {
    if (options.preloaded) {
      const preloaded = options.preloaded;
      const candidatePublicDir = join(projectRoot, "public");
      publicDir = existsSync(candidatePublicDir) ? candidatePublicDir : null;
      stylesheetHref =
        options.stylesheetHref ??
        (publicDir && existsSync(join(publicDir, "styles.css")) ? "/styles.css" : undefined);
      if (preloaded.notFoundComponent) notFoundComponent = preloaded.notFoundComponent;
      if (preloaded.notFoundLayout) notFoundLayout = preloaded.notFoundLayout;

      const loaded: RouteHandler[] = [];
      for (const p of preloaded.routes) {
        const actions = p.module.actions as
          | Record<string, (...args: unknown[]) => Promise<unknown>>
          | undefined;
        if (actions) {
          registerServerFunctions(p.entry.routePath, p.entry.paramNames, actions);
        }

        if (p.entry.isApi) {
          loaded.push({
            entry: p.entry,
            mode: p.mode,
            revalidate: undefined,
            handler: makeApiHandler(p.entry, p.module),
          });
          continue;
        }

        const Component = p.module.default as ComponentType<RouteProps> | undefined;
        if (!Component) continue;

        const routeMiddleware = p.module.middleware as MiddlewareFn | undefined;
        const middlewareModules = routeMiddleware
          ? [...p.middlewareModules, routeMiddleware]
          : p.middlewareModules;

        loaded.push({
          entry: p.entry,
          mode: p.mode,
          revalidate: p.revalidate,
          handler: makePageHandler({
            route: p.entry,
            mode: p.mode,
            revalidate: p.revalidate,
            loader: p.module.loader as ((args: LoaderArgs) => Promise<LoaderReturn>) | undefined,
            Component,
            layoutModules: p.layoutModules,
            layoutFilePaths: p.layoutFilePaths ?? [],
            middlewareModules,
            islandScripts: p.islandScripts,
          }),
        });
      }
      handlers = sortRoutes(loaded);
      return;
    }

    resetServerFunctions();
    actionModules = new Map();
    islandBundleCache.clear();
    islandFileCache.clear();
    const pagesDir: string = primaryDir;
    const apiDir: string | undefined = options.apiDir;

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
    if (resolvedActionsDir) {
      const actionFiles = scanRoutes(resolvedActionsDir);
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
        const fnNames: string[] = [];
        if (actions) {
          registerServerFunctions(parentPath, actionFile.paramNames, actions);
          fnNames.push(...Object.keys(actions));
        }
        // Individual named exports — each function is an action under parent path
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

    const candidatePublicDir = join(projectRoot, "public");
    publicDir = existsSync(candidatePublicDir) ? candidatePublicDir : null;
    stylesheetHref =
      options.stylesheetHref ??
      (publicDir && existsSync(join(publicDir, "styles.css")) ? "/styles.css" : undefined);

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
          handler: makeApiHandler(route, mod),
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
      const layoutFilePaths = layoutChain.map((l) => l.filePath);
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
        handler: makePageHandler({
          route,
          mode,
          revalidate,
          loader,
          Component,
          layoutModules,
          layoutFilePaths,
          middlewareModules,
        }),
      });
    }

    handlers = sortRoutes(loaded);

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

    // Revalidation mutates the ISR cache, so it must be same-origin. Without
    // this, any website could send a cross-site POST to farm a cache purge.
    const csrfResult = checkCsrf(req, options.security?.csrf);
    if (!csrfResult.ok) {
      return new Response(`Forbidden: ${csrfResult.reason}`, { status: 403 });
    }

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
          [primaryDir, options.apiDir, options.layoutsDir, resolvedActionsDir, srcDir].filter(
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

    const devFetchInner = async (
      req: Request,
      server?: import("./security/rate-limit").RateLimitServer,
    ) => {
      const url = new URL(req.url).pathname;

      const healthResult = await healthHandler(req);
      if (healthResult !== null) return healthResult;

      if (metricsReporter?.handleMetrics) {
        const metricsResult = await metricsReporter.handleMetrics(req);
        if (metricsResult !== null) return metricsResult;
      }

      if (rateLimiter) {
        const limited = await rateLimitMiddleware(rateLimiter, req, server);
        if (limited !== null) {
          metricsReporter?.incr("x_rate_limit_rejections_total", 1, { method: req.method });
          return limited;
        }
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
            console.log(`[x][reload] client connected (${sseClients.size} total)`);

            // Bun.serve's default idleTimeout is 10s — a connection that
            // just sits open waiting for a future file-change event goes
            // idle and gets killed by Bun mid-stream, which is what was
            // producing ERR_INCOMPLETE_CHUNKED_ENCODING in the browser (see
            // the "[Bun.serve]: request timed out after 10 seconds" log
            // lines). A heartbeat well under that window keeps the
            // connection active so it never hits the idle timeout.
            const heartbeat = setInterval(() => {
              try {
                send("hb", "");
              } catch (err) {
                console.log(`[x][reload] heartbeat failed, clearing interval: ${String(err)}`);
                clearInterval(heartbeat);
              }
            }, 5000);

            req.signal.addEventListener("abort", () => {
              clearInterval(heartbeat);
              sseClients.delete(send);
              console.log(`[x][reload] client disconnected (${sseClients.size} total)`);
            });
          },
        });
        // NOTE: no "Connection" header here on purpose — it's a hop-by-hop
        // header that Bun's HTTP server manages itself based on real socket
        // state. Setting it manually on a chunked/streamed response was
        // producing malformed chunked framing (ERR_INCOMPLETE_CHUNKED_ENCODING
        // in Chrome) because it fights with whatever Bun actually writes.
        return new Response(body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      }

      const revalidationResult = await handleRevalidation(req);
      if (revalidationResult !== null) return revalidationResult;

      const serverFnResult = await serverFnHandler(req);
      if (serverFnResult !== null) return serverFnResult;

      const staticAsset = await serveStaticAsset(publicDir, req);
      if (staticAsset !== null) return staticAsset;

      const islandBundle = serveIslandBundle(req);
      if (islandBundle !== null) return islandBundle;

      const proxiedImage = await imageProxyHandler(req);
      if (proxiedImage !== null) return proxiedImage;

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

    const devFetchHardened = async (
      req: Request,
      server?: import("./security/rate-limit").RateLimitServer,
    ) => withResponseHardening(await devFetchInner(req, server));
    const devFetchBase = loggingEnabled ? withRequestLogging(devFetchHardened) : devFetchHardened;
    const devFetch = metricsReporter
      ? withRequestMetrics(metricsReporter, devFetchBase)
      : devFetchBase;

    return {
      routes: {},
      development: true,
      port: options.port ?? 3000,
      fetch: devFetch,
    };
  }

  // Production -- same iteration logic as dev, so dynamic routes, layouts,
  // middleware, static assets and 404 page all work identically.
  const prodFetchInner = async (
    req: Request,
    server?: import("./security/rate-limit").RateLimitServer,
  ) => {
    const url = new URL(req.url).pathname;

    const healthResult = await healthHandler(req);
    if (healthResult !== null) return healthResult;

    if (metricsReporter?.handleMetrics) {
      const metricsResult = await metricsReporter.handleMetrics(req);
      if (metricsResult !== null) return metricsResult;
    }

    if (rateLimiter) {
      const limited = await rateLimitMiddleware(rateLimiter, req, server);
      if (limited !== null) {
        metricsReporter?.incr("x_rate_limit_rejections_total", 1, { method: req.method });
        return limited;
      }
    }

    const revalidationResult = await handleRevalidation(req);
    if (revalidationResult !== null) return revalidationResult;

    const serverFnResult = await serverFnHandler(req);
    if (serverFnResult !== null) return serverFnResult;

    const staticAsset = await serveStaticAsset(publicDir, req);
    if (staticAsset !== null) return staticAsset;

    const islandBundle = serveIslandBundle(req);
    if (islandBundle !== null) return islandBundle;

    const proxiedImage = await imageProxyHandler(req);
    if (proxiedImage !== null) return proxiedImage;

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

  const prodFetchHardened = async (
    req: Request,
    server?: import("./security/rate-limit").RateLimitServer,
  ) => withResponseHardening(await prodFetchInner(req, server));
  const prodFetchBase = loggingEnabled ? withRequestLogging(prodFetchHardened) : prodFetchHardened;
  const prodFetch = metricsReporter
    ? withRequestMetrics(metricsReporter, prodFetchBase)
    : prodFetchBase;

  return {
    routes: {},
    development: false,
    port: options.port ?? 3000,
    fetch: prodFetch,
  };
}
