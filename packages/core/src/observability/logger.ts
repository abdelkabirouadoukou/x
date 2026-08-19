/**
 * Structured JSON logging. Replaces ad-hoc `console.log` with one JSON
 * object per line — easy to ingest into Datadog, Grafana Loki, Kibana, etc.
 */

import { redactString, redactValue } from "./redact";

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
    message: redactString(message),
    ...(redactValue(fields) as LogFields | undefined),
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
 * A second argument (Bun.serve's `server` handle) is forwarded untouched so
 * downstream middleware like the rate limiter can resolve the client IP.
 */
export function withRequestLogging<Server = unknown>(
  handler: (req: Request, server?: Server) => Response | Promise<Response>,
): (req: Request, server?: Server) => Promise<Response> {
  return async (req: Request, server?: Server) => {
    const start = performance.now();
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const route = new URL(req.url).pathname;

    try {
      const res = await handler(req, server);
      const isStream = res.headers.get("content-type")?.includes("text/event-stream");
      console.log(
        `[x][request] ${req.method} ${route} -> ${res.status}${isStream ? " (stream opened, not closed)" : ""}`,
      );
      write("info", isStream ? "stream opened" : "request completed", {
        requestId,
        route,
        method: req.method,
        status: res.status,
        durationMs: Math.round(performance.now() - start),
      });
      // Mutate in place instead of `new Response(res.body, ...)` — for a
      // streamed body (SSE) that reconstruction re-parents the live
      // ReadableStream on every request for no reason and was compounding
      // the chunked-encoding framing bug in the /__x/reload endpoint.
      if (!res.headers.has("x-request-id")) {
        res.headers.set("x-request-id", requestId);
      }
      return res;
    } catch (err) {
      write("error", "request failed", {
        requestId,
        route,
        method: req.method,
        status: 500,
        durationMs: Math.round(performance.now() - start),
        // Redacted before emission — a throwing driver or app error whose
        // message embeds a secret must never leak it into the log sink.
        error: redactString(err instanceof Error ? err.message : String(err)),
      });
      throw err;
    }
  };
}
