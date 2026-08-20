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
import {
  type ErrorContext,
  type ErrorReporter,
  reportException,
  setErrorReporter,
} from "./observability/monitoring";
import { tracePhase, withRequestTracing } from "./observability/tracing";
import type { LoaderArgs, LoaderReturn } from "./render";
import { renderPage, renderPageOnce, renderStreamingPage } from "./render";
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
import {
  DEFAULT_MAX_BODY_SIZE,
  enforceRequestBodySize,
  RequestBodyTooLargeError,
} from "./security/body-size";
import { type CsrfOptions, checkCsrf, originFromHeader, requestOrigin } from "./security/csrf";
import { applySecurityHeaders, type SecurityHeadersOptions } from "./security/headers";
import { type ComputeResult, IsrCache, isrCacheKey } from "./security/isr-cache";
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
   * Maximum request body size in bytes, enforced ahead of route/action
   * dispatch (including `/api/*` and `/__x/actions/*`). Requests whose
   * `Content-Length` exceeds this are rejected with 413; chunked requests
   * without a `Content-Length` are aborted mid-stream once the limit is
   * crossed. Default: 1 MiB.
   */
  maxBodySize?: number;
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
  /** Last-resort error boundary: called when the fetch handler throws. */
  error?: (error: Error) => Response;
}

export interface RevalidateOptions {
  revalidate?: number;
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
//
// Same-category ties are broken segment-by-segment, positional specificity:
// a literal segment beats a param which beats a catch-all. This picks a
// deterministic winner independent of the OS's directory-scan order — e.g.
// `/bar/[b]` vs `/[a]/foo` both matching `/bar/foo` → `/bar/[b]` wins because
// its first segment is literal. Fully-tied routes fall back to a lexical
// sort on the route path.
function sortRoutes(handlers: RouteHandler[]): RouteHandler[] {
  return handlers.sort((a, b) => {
    const category = routeMatchesForSort(a.entry) - routeMatchesForSort(b.entry);
    if (category !== 0) return category;
    for (const [as, bs] of zip(segmentSpecificity(a.entry), segmentSpecificity(b.entry))) {
      if (as !== bs) return as - bs;
    }
    return a.entry.routePath < b.entry.routePath ? -1 : 1;
  });
}

function routeMatchesForSort(entry: RouteEntry): number {
  const isStatic = entry.paramNames.length === 0;
  const isCatchAll = entry.routePath.includes("*");
  return isStatic ? 0 : isCatchAll ? 2 : 1;
}

/** Literal=0, param (`:x`)=1, catch-all (`*`)=2, per segment. */
function segmentSpecificity(entry: RouteEntry): number[] {
  return entry.routePath
    .split("/")
    .filter((seg) => seg.length > 0)
    .map((seg) => (seg === "*" ? 2 : seg.startsWith(":") ? 1 : 0));
}

function zip<A, B>(as: A[], bs: B[]): Array<[A, B]> {
  const out: Array<[A, B]> = [];
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    out.push([as[i] as A, bs[i] as B]);
  }
  return out;
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
  nonce?: string,
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
    {
      title,
      stylesheet,
      liveReload: dev,
      ...(nonce ? { cspNonce: nonce } : {}),
    },
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
  const staticCache = new IsrCache(500);
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
  const maxBodySize = options.maxBodySize ?? DEFAULT_MAX_BODY_SIZE;
  const securityHeadersOptions = options.security?.headers;
  const loggingEnabled = options.observability?.logging ?? true;
  const imageProxyHandler = createImageProxyHandler(options.images);

  const CSP_NONCE_HEADER = "x-csp-nonce";

  /** 128-bit CSPRNG nonce (web-platform, base64url-unpadded). */
  function generateCspNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let bin = "";
    for (const byte of bytes) bin += String.fromCharCode(byte);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function withResponseHardening(res: Response): Response {
    if (securityHeadersOptions === false) return res;
    // The nonce travels on the response so ISR cache hits can emit the exact
    // value baked into the cached HTML. Strip it before it reaches the client.
    const cspNonce = res.headers.get(CSP_NONCE_HEADER) ?? undefined;
    if (cspNonce) res.headers.delete(CSP_NONCE_HEADER);
    return applySecurityHeaders(res, {
      ...securityHeadersOptions,
      ...(cspNonce ? { cspNonce } : {}),
    });
  }

  async function renderNotFound(_req?: Request): Promise<Response> {
    const content = notFoundLayout
      ? createElement(notFoundLayout, null, createElement(notFoundComponent, { params: {} }))
      : createElement(notFoundComponent, { params: {} });
    const cspNonce = generateCspNonce();
    const html = renderPage(content, {
      title: "404 — Not Found",
      stylesheet: stylesheetHref,
      liveReload: dev,
      cspNonce,
    });
    const res = new Response(html, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    res.headers.set(CSP_NONCE_HEADER, cspNonce);
    return res;
  }

  const makeApiHandler =
    (route: RouteEntry, module: Record<string, unknown>): ((req: Request) => Promise<Response>) =>
    async (req: Request) => {
      try {
        const method = req.method;
        const handlerFn = module[method];
        if (typeof handlerFn === "function") {
          const result = await tracePhase("x.api", { route: route.routePath, method }, async () =>
            (handlerFn as (r: Request) => unknown)(req),
          );
          if (result instanceof Response) return result;
          if (result === undefined || result === null) {
            return new Response("OK", { status: 200 });
          }
          return Response.json(result);
        }
        return new Response(`Method ${method} not allowed`, { status: 405 });
      } catch (err) {
        if (err instanceof RequestBodyTooLargeError) {
          return new Response("Payload too large", { status: 413 });
        }
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

        const baseHandler = async (ctx: { params: Record<string, string>; request: Request }) => {
          // Cache key is the full URL (pathname + search): two ISR pages that
          // differ only by query string are distinct resources and must not
          // serve each other's cached HTML.
          const cacheKey = isrCacheKey(ctx.request.url);

          if (mode === "server") {
            let loaderData: Record<string, unknown> = {};
            if (loader) {
              const result = await tracePhase("x.loader", { route: route.routePath }, () =>
                loader(ctx),
              );
              if (result instanceof Response) return result;
              loaderData = result;
            }
            const registry = createIslandRegistry();
            const content = createElement(
              IslandProvider,
              { registry },
              wrapWithLayouts(Component, ctx.params, loaderData, layoutModules),
            );
            const cspNonce = generateCspNonce();

            const stream = await tracePhase(
              "x.ssr",
              { route: route.routePath, streaming: true },
              () =>
                renderStreamingPage(content, {
                  stylesheet: stylesheetHref,
                  liveReload: dev,
                  cspNonce,
                  ...(islandScripts === undefined
                    ? {
                        // Single-render mode: islands register into `registry`
                        // during the one render that produces the HTML, and the
                        // script list is resolved from that same pass in the lazy
                        // footer — no separate discovery render, so non-deterministic
                        // components can't diverge between two passes.
                        resolveIslandScripts: () =>
                          resolveIslandScripts(route.filePath, layoutFilePaths, registry.entries),
                      }
                    : { islandScripts }),
                  onRenderError: (error) => {
                    reportException(error, { route: route.routePath, phase: "ssr" });
                    metricsReporter?.incr("x_http_errors_total", 1, { phase: "ssr" });
                  },
                }),
            );
            const res = new Response(stream, {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
            res.headers.set(CSP_NONCE_HEADER, cspNonce);
            return res;
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
              const res = new Response(cached.html, {
                headers: {
                  "Content-Type": "text/html; charset=utf-8",
                  "X-Revalidated": "hit",
                },
              });
              res.headers.set(CSP_NONCE_HEADER, cached.cspNonce);
              return res;
            }
            // Stale entry: drop it so the miss path recomputes instead of
            // getOrCompute serving the expired HTML back to us.
            if (cached) staticCache.delete(cacheKey);
          }

          // Loader + render, shared by the miss path. Hoisted so a stampede of
          // concurrent misses for the same URL renders once, not N times.
          const computeHtml = async (): Promise<ComputeResult | Response> => {
            let loaderData: Record<string, unknown> = {};
            if (loader) {
              const result = await tracePhase("x.loader", { route: route.routePath }, () =>
                loader(ctx),
              );
              if (result instanceof Response) return result;
              loaderData = result;
            }

            const registry = createIslandRegistry();
            const content = createElement(
              IslandProvider,
              { registry },
              wrapWithLayouts(Component, ctx.params, loaderData, layoutModules),
            );
            const cspNonce = generateCspNonce();
            const html = await tracePhase(
              "x.ssr",
              { route: route.routePath, streaming: false },
              () =>
                renderPageOnce(content, {
                  stylesheet: stylesheetHref,
                  liveReload: dev,
                  cspNonce,
                  ...(islandScripts === undefined
                    ? {
                        resolveIslandScripts: () =>
                          resolveIslandScripts(route.filePath, layoutFilePaths, registry.entries),
                      }
                    : { islandScripts }),
                }),
            );
            return { html, cspNonce };
          };

          if (revalidateSeconds > 0) {
            const result = await staticCache.getOrCompute(cacheKey, computeHtml);
            if (result instanceof Response) return result;
            const res = new Response(result.html, {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "X-Revalidated": "miss",
              },
            });
            res.headers.set(CSP_NONCE_HEADER, result.cspNonce);
            return res;
          }

          const result = await computeHtml();
          if (result instanceof Response) return result;

          const res = new Response(result.html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "X-Revalidated": "none",
            },
          });
          res.headers.set(CSP_NONCE_HEADER, result.cspNonce);
          return res;
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
        if (err instanceof RequestBodyTooLargeError) {
          return new Response("Payload too large", { status: 413 });
        }
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
          const cspNonce = generateCspNonce();
          const html = renderContentPage(entry, stylesheetHref, dev, cspNonce);
          const res = new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
          res.headers.set(CSP_NONCE_HEADER, cspNonce);
          return res;
        },
      }));
      contentHandlers = loadedContent;
    }
  }

  await buildHandlers();

  /**
   * Applies `maxBodySize` ahead of everything else in the request pipeline.
   * `enforceRequestBodySize` either rejects the request immediately (413 when
   * `Content-Length` is already over the budget) or hands back a request whose
   * body stream aborts itself the moment it crosses the limit while being
   * read. Because this wraps the innermost fetch, it covers `/api/*`,
   * `/__x/actions/*`, revalidation, hydration-mismatch beacons, and any route
   * middleware that reads the body — not just the framework's own parsers.
   */
  const withBodySizeLimit =
    (inner: typeof prodFetchInner) =>
    async (
      req: Request,
      server?: import("./security/rate-limit").RateLimitServer,
    ): Promise<Response> => {
      const guarded = enforceRequestBodySize(req, maxBodySize);
      if (guarded instanceof Response) return guarded;
      return inner(guarded, server);
    };

  /**
   * Top-of-fetch error boundary. Every exception that escapes a route-level
   * boundary in `devFetchInner`/`prodFetchInner` lands here: it is reported to
   * the configured error reporter and/or metrics, and the request gets a clean
   * 500 instead of taking down the whole Bun process.
   */
  async function guardFetchErrors(
    inner: typeof prodFetchInner,
    req: Request,
    server?: import("./security/rate-limit").RateLimitServer,
  ): Promise<Response> {
    try {
      return await inner(req, server);
    } catch (error) {
      const path = new URL(req.url).pathname;
      const phase: ErrorContext["phase"] = path.startsWith("/__x/actions/")
        ? "action"
        : path === "/__x/revalidate"
          ? "api"
          : "loader";
      reportException(error, { phase, route: path });
      const e = error instanceof Error ? error.message : String(error);
      return new Response(
        options.development ? `Internal Server Error: ${e}` : "Internal Server Error",
        { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }
  }

  async function handleRevalidation(req: Request): Promise<Response | null> {
    if (new URL(req.url).pathname !== "/__x/revalidate") return null;
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    // Revalidation mutates the ISR cache, so it must be same-origin. Without
    // this, any website could send a cross-site POST to farm a cache purge.
    const csrfResult = checkCsrf(req, options.security?.csrf);
    if (!csrfResult.ok) {
      return new Response(`Forbidden: ${csrfResult.reason}`, { status: 403 });
    }

    let body: { path?: string };
    try {
      body = (await req.json()) as { path?: string };
    } catch (err) {
      if (err instanceof RequestBodyTooLargeError) {
        return new Response("Payload too large", { status: 413 });
      }
      return new Response("Invalid JSON body", { status: 400 });
    }
    if (body.path) {
      // Keys are full URLs now (pathname + search); a revalidation request
      // names a path, so purge every cached entry under that pathname —
      // query variants of the same page are all stale together.
      const removed = staticCache.deletePath(new URL(body.path, "http://localhost").pathname);
      return new Response(`Revalidated: ${body.path} (${removed} cached variant(s))`);
    }
    staticCache.clear();
    return new Response("Revalidated all");
  }

  async function handleHydrationMismatch(req: Request): Promise<Response | null> {
    if (new URL(req.url).pathname !== "/__x/hydration-mismatch") return null;
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    // The beacon is a read-only telemetry signal, but a random site could
    // still spam it. Reject cross-site posts (missing Origin/Referer is
    // tolerated — server-side emits, e.g. sendBeacon from file://, may omit
    // them, and the worst case there is a discarded telemetry line).
    //
    // Exact-match the canonical origin: parsing (then comparing the full
    // `origin` string) is required, since a prefix match would let
    // `https://localhost.evil.com` pass, not just `https://localhost`. A
    // present-but-unparseable header (`Origin: null` from a sandboxed/opaque
    // origin) is a cross-site signal, not a missing one, so refuse it.
    const selfOrigin = requestOrigin(req);
    const rawOrigin = req.headers.get("origin");
    const rawReferer = req.headers.get("referer");
    const origin = originFromHeader(rawOrigin);
    const referer = originFromHeader(rawReferer);
    if (origin !== null) {
      if (origin !== selfOrigin) return new Response("Forbidden", { status: 403 });
    } else if (rawOrigin !== null) {
      return new Response("Forbidden", { status: 403 });
    } else if (referer !== null) {
      if (referer !== selfOrigin) return new Response("Forbidden", { status: 403 });
    } else if (rawReferer !== null) {
      return new Response("Forbidden", { status: 403 });
    }

    let body: { error?: string; island?: string; url?: string };
    try {
      const text = await req.text();
      if (text.length > 2048) return new Response("Payload too large", { status: 413 });
      body = JSON.parse(text) as { error?: string; island?: string; url?: string };
    } catch (err) {
      if (err instanceof RequestBodyTooLargeError) {
        return new Response("Payload too large", { status: 413 });
      }
      return new Response("Invalid JSON body", { status: 400 });
    }

    const error = new Error(body.error ?? "hydration mismatch");
    const routeFromUrl = body.url ? new URL(body.url).pathname : "/";
    reportException(error, {
      route: routeFromUrl,
      phase: "ssr",
      tag: "hydration-mismatch",
    });
    metricsReporter?.incr("x_http_hydration_mismatch", 1, { island: body.island ?? "unknown" });
    return new Response(null, { status: 204 });
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

      const mismatchResult = await handleHydrationMismatch(req);
      if (mismatchResult !== null) return mismatchResult;

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
    ) =>
      withResponseHardening(await guardFetchErrors(withBodySizeLimit(devFetchInner), req, server));
    const devFetchBase = loggingEnabled ? withRequestLogging(devFetchHardened) : devFetchHardened;
    // Tracing is outermost so spans cover logging + metrics + hardening. It
    // stamps the request id into the request it forwards, so the logging
    // wrapper below it correlates to the same request id.
    const devFetchTraced = withRequestTracing(devFetchBase);
    const devFetch = metricsReporter
      ? withRequestMetrics(metricsReporter, devFetchTraced)
      : devFetchTraced;

    return {
      routes: {},
      development: true,
      port: options.port ?? 3000,
      fetch: devFetch,
      // Last-resort boundary: `guardFetchErrors` catches exceptions raised
      // inside routing, but anything thrown by the request-stack wrappers
      // (logging/metrics/hardening) or by Bun itself still reaches the
      // process. Returning a 500 here keeps the server up.
      error: (error: Error) => {
        reportException(error, { phase: "api" });
        return new Response("Internal Server Error", { status: 500 });
      },
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

    const mismatchResult = await handleHydrationMismatch(req);
    if (mismatchResult !== null) return mismatchResult;

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
  ) =>
    withResponseHardening(await guardFetchErrors(withBodySizeLimit(prodFetchInner), req, server));
  const prodFetchBase = loggingEnabled ? withRequestLogging(prodFetchHardened) : prodFetchHardened;
  const prodFetchTraced = withRequestTracing(prodFetchBase);
  const prodFetch = metricsReporter
    ? withRequestMetrics(metricsReporter, prodFetchTraced)
    : prodFetchTraced;

  return {
    routes: {},
    development: false,
    port: options.port ?? 3000,
    fetch: prodFetch,
    error: (error: Error) => {
      reportException(error, { phase: "api" });
      return new Response("Internal Server Error", { status: 500 });
    },
  };
}
