import {
  BackpressureSaturatedError,
  type BackpressureLease,
  type BackpressureOptions,
  createBackpressureController,
} from "./backpressure";
import {
  createApp as createBaseApp,
  type AppServeOptions,
  type CreateAppOptions as BaseCreateAppOptions,
} from "./createApp";

/** Public application options, including opt-in per-process backpressure. */
export interface CreateAppOptions extends BaseCreateAppOptions {
  /**
   * Bounds requests admitted into the application request pipeline for this
   * process. `undefined`/`false` keeps the existing unbounded behavior.
   *
   * Liveness/readiness probes, an enabled built-in `/metrics` endpoint, and
   * the development live-reload stream bypass admission so overload cannot
   * make the process look dead or consume a permanent slot with the dev SSE
   * connection.
   */
  backpressure?: BackpressureOptions | false;
}

type RuntimeFetch = (req: Request, server?: unknown) => Response | Promise<Response>;

function bypassBackpressure(
  req: Request,
  development: boolean,
  hasMetricsEndpoint: boolean,
): boolean {
  const pathname = new URL(req.url).pathname;
  return (
    pathname === "/healthz" ||
    pathname === "/readyz" ||
    (hasMetricsEndpoint && pathname === "/metrics") ||
    pathname.startsWith("/_islands/") ||
    (development && pathname === "/__x/reload")
  );
}

function saturatedResponse(error: BackpressureSaturatedError): Response {
  return new Response("Service Unavailable", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(error.retryAfterSeconds),
    },
  });
}

/** Type-safe config helper for x.config.ts. */
export function defineConfig(config: CreateAppOptions): CreateAppOptions {
  return config;
}

/**
 * Creates the normal application and, when configured, places one bounded
 * admission gate in front of its request pipeline.
 *
 * The controller is per `createApp()` call/process. Saturation returns 503 +
 * Retry-After. A client that disconnects while queued is removed without
 * entering the application pipeline or being turned into a false 500.
 *
 * Rate limiting remains the existing inner createApp policy. The two controls
 * keep distinct semantics (429 policy vs 503 process capacity), but if the
 * process is already saturated the outer admission gate can return 503 before
 * the request reaches the inner rate limiter.
 */
export async function createApp(options: CreateAppOptions): Promise<AppServeOptions> {
  const { backpressure, ...baseOptions } = options;
  const app = await createBaseApp(baseOptions);

  if (backpressure === undefined || backpressure === false) return app;

  const controller = createBackpressureController(backpressure);
  const baseFetch = app.fetch as RuntimeFetch;
  const metrics = options.observability?.metrics;
  const hasMetricsEndpoint = metrics?.handleMetrics !== undefined;

  const fetch: RuntimeFetch = async (req, server) => {
    if (bypassBackpressure(req, app.development, hasMetricsEndpoint)) {
      return baseFetch(req, server);
    }

    const startedAt = performance.now();
    let lease: BackpressureLease;
    try {
      lease = await controller.acquire(req.signal);
    } catch (error) {
      if (error instanceof BackpressureSaturatedError) {
        metrics?.incr("x_backpressure_rejections_total", 1, { method: req.method });
        metrics?.incr("x_http_requests_total", 1, { method: req.method, status: "503" });
        metrics?.observe("x_http_request_duration_ms", performance.now() - startedAt, {
          method: req.method,
        });
        return saturatedResponse(error);
      }
      if (req.signal.aborted) {
        // The client is already gone. Keep this cancellation out of the
        // application's 500/error-report path while still settling the fetch.
        metrics?.incr("x_http_requests_total", 1, { method: req.method, status: "499" });
        metrics?.observe("x_http_request_duration_ms", performance.now() - startedAt, {
          method: req.method,
        });
        return new Response(null, { status: 499 });
      }
      throw error;
    }

    try {
      return await baseFetch(req, server);
    } finally {
      lease.release();
    }
  };

  return { ...app, fetch: fetch as AppServeOptions["fetch"] };
}
