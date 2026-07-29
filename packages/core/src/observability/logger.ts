/**
 * Structured JSON logging. Replaces ad-hoc `console.log` with one JSON
 * object per line — easy to ingest into Datadog, Grafana Loki, Kibana, etc.
 */

export interface LogFields {
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

function write(level: "info" | "warn" | "error", message: string, fields?: LogFields): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger: Logger = {
  info: (message, fields) => write("info", message, fields),
  warn: (message, fields) => write("warn", message, fields),
  error: (message, fields) => write("error", message, fields),
};

/**
 * Wraps a fetch handler so every request is logged as one structured JSON
 * line with `timestamp`, `requestId`, `route`, `status`, and `durationMs`.
 */
export function withRequestLogging(
  handler: (req: Request) => Response | Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const start = performance.now();
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const route = new URL(req.url).pathname;

    try {
      const res = await handler(req);
      write("info", "request completed", {
        requestId,
        route,
        method: req.method,
        status: res.status,
        durationMs: Math.round(performance.now() - start),
      });
      if (!res.headers.has("x-request-id")) {
        const headers = new Headers(res.headers);
        headers.set("x-request-id", requestId);
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
      }
      return res;
    } catch (err) {
      write("error", "request failed", {
        requestId,
        route,
        method: req.method,
        status: 500,
        durationMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}
