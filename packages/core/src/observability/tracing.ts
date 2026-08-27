/**
 * Request-scoped tracing.
 *
 * `@thexjs/core` never initializes an OpenTelemetry SDK — apps opt in by
 * providing a tracer whose spans match the tiny surface below (the real OTel
 * `startSpan(name, { attributes })` fits). When no tracer is configured the
 * whole layer degrades to synchronous no-ops, and when work runs outside a
 * traced request (a scheduler, a build-time render, a worker thread) phase
 * spans are skipped entirely.
 *
 * Correlation: every span carries the request's `x.requestId` as the
 * `x.requestId` attribute, and the root `x.http` span also records route,
 * method and response status. SDK-level parent/child wiring is the app's
 * concern (it owns the OTel context); this module records the correlation
 * attribute that makes spans drillable.
 */

interface TraceContext {
  requestId: string;
}

export interface TraceSpan {
  setAttribute(key: string, value: unknown): void;
  recordException(error: unknown): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

/** Minimal surface a tracer must expose. Compatible with OTel's `Tracer`. */
export interface TracerLike {
  startSpan(name: string, options?: { attributes?: Record<string, unknown> }): TraceSpan;
}

const noopSpan: TraceSpan = {
  setAttribute: () => {},
  recordException: () => {},
  setStatus: () => {},
  end: () => {},
};

const noopTracer: TracerLike = {
  startSpan: () => noopSpan,
};

let activeTracer: TracerLike = noopTracer;

export function setTracer(tracer: TracerLike): void {
  activeTracer = tracer;
}

export function getTracer(): TracerLike {
  return activeTracer;
}

/** Matches @opentelemetry/api's SpanStatusCode.ERROR. */
export const OTEL_ERROR_STATUS_CODE = 2;

/**
 * Lazy AsyncLocalStorage. Kept off the top-level import so this module can be
 * bundled for the browser (client bundles import `@thexjs/core` index): the
 * require only executes on a server runtime, and any platform without
 * async_hooks degrades to "no request context" instead of crashing.
 */
import { SAFE_REQUEST_ID_RE } from "../security/validation";
import { redactString } from "./redact";

interface AsyncLocalStorageLike {
  getStore(): TraceContext | undefined;
  run<R>(ctx: TraceContext, fn: () => R): R;
}
let requestStorage: AsyncLocalStorageLike | null = null;

function asyncLocalStorage(): AsyncLocalStorageLike {
  if (requestStorage) return requestStorage;
  try {
    const { AsyncLocalStorage } = import.meta.require("node:async_hooks") as {
      AsyncLocalStorage: new () => AsyncLocalStorageLike;
    };
    requestStorage = new AsyncLocalStorage();
  } catch {
    requestStorage = {
      getStore: () => undefined,
      run: <R>(_ctx: TraceContext, fn: () => R) => fn(),
    };
  }
  return requestStorage;
}

/**
 * Runs `work` inside a traced request context and the `x.http` root span.
 * `finish` records extra attributes on the root span before it closes (e.g.
 * the response status); `fail` records the error as an exception + error
 * status. Spans started via {@link tracePhase} inside `work` inherit the
 * request id.
 */
export async function runWithRequestSpan<T>(
  requestId: string,
  initAttributes: Record<string, unknown>,
  work: (
    finish: (attributes?: Record<string, unknown>) => void,
    fail: (error: unknown) => void,
  ) => Promise<T>,
): Promise<T> {
  const root = activeTracer.startSpan("x.http", {
    attributes: { "x.requestId": requestId, ...initAttributes },
  });
  const storage = asyncLocalStorage();
  return storage.run({ requestId }, async () => {
    try {
      const value = await work(
        (attributes) => {
          if (attributes) {
            for (const [key, item] of Object.entries(attributes)) {
              root.setAttribute(key, item);
            }
          }
        },
        (error) => recordError(root, error),
      );
      root.end();
      return value;
    } catch (error) {
      recordError(root, error);
      root.end();
      throw error;
    }
  });
}

function recordError(span: TraceSpan, error: unknown): void {
  span.recordException(error);
  span.setStatus({
    code: OTEL_ERROR_STATUS_CODE,
    message: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Opens a `x.<name>` span carrying the current request's id around `work`,
 * recording any thrown error. Outside a traced request this is a transparent
 * passthrough (no span, no overhead).
 */
export async function tracePhase<T>(
  name: string,
  attributes: Record<string, unknown>,
  work: () => Promise<T>,
): Promise<T> {
  const context = asyncLocalStorage().getStore();
  if (!context) return work();
  const span = activeTracer.startSpan(name, {
    attributes: { "x.requestId": context.requestId, ...attributes },
  });
  try {
    return await work();
  } catch (error) {
    recordError(span, error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Synchronous variant of {@link tracePhase}, for sync APIs like
 * `bun:sqlite`. Same rules: no request context → plain passthrough.
 */
export function tracePhaseSync<T>(
  name: string,
  attributes: Record<string, unknown>,
  work: () => T,
): T {
  const context = asyncLocalStorage().getStore();
  if (!context) return work();
  const span = activeTracer.startSpan(name, {
    attributes: { "x.requestId": context.requestId, ...attributes },
  });
  try {
    return work();
  } catch (error) {
    recordError(span, error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Masks quoted string literals in a SQL statement so bound values / inline
 * constants never surface in a trace attribute. Both single- and double-quoted
 * strings are collapsed to a `?` placeholder (doubled quotes — Postgres '' and
 * "" escapes — included) before the statement is recorded.
 */
function maskSqlLiterals(statement: string): string {
  return statement.replace(/'(?:[^']|'')*'/g, "'?'").replace(/"(?:[^"]|"")*"/g, '"?"');
}

/**
 * Attribute set for a `x.db` span: driver vendor, the statement's operation
 * family (SELECT/INSERT/...) and a redacted + truncated statement. Statements
 * can embed literals; `redactString` masks bearer/authorization-shaped parts,
 * `maskSqlLiterals` collapses every quoted string, and truncation keeps giant
 * queries out of the trace backend.
 */
export function dbTraceAttributes(system: string, statement: string): Record<string, unknown> {
  const keyword = /^\s*(\w+)/.exec(statement)?.[1]?.toLowerCase();
  return {
    "db.system": system,
    "db.operation": keyword ?? "other",
    "db.statement": maskSqlLiterals(redactString(statement)).trim().slice(0, 512),
  };
}

/**
 * The request id a given `Request` is traced under. Allows wrappers down the
 * chain (e.g. request logging) to reuse the id that withRequestTracing minted
 * without copying the request — cloning a Request whose body is a live
 * ReadableStream hangs Bun's body pump, so the id travels in a side table
 * instead of a cloned header.
 */
const requestIds = new WeakMap<Request, string>();

function safeRequestId(raw: string | null): string | null {
  if (raw === null) return null;
  return SAFE_REQUEST_ID_RE.test(raw) ? raw : null;
}

export function traceRequestId(req: Request): string {
  return (
    requestIds.get(req) ?? safeRequestId(req.headers.get("x-request-id")) ?? crypto.randomUUID()
  );
}

/**
 * Wraps a fetch handler so every request gets an `x.http` root span carrying
 * the request id (reusing an inbound `x-request-id` if the ingress already
 * assigned one, otherwise minting one and sharing it via
 * {@link traceRequestId} so downstream wrappers correlate to the same id).
 * The request object is passed through untouched — see {@link traceRequestId}.
 */
export function withRequestTracing<Server = unknown>(
  handler: (req: Request, server?: Server) => Response | Promise<Response>,
): (req: Request, server?: Server) => Promise<Response> {
  return async (req: Request, server?: Server) => {
    const existing = safeRequestId(req.headers.get("x-request-id"));
    const requestId = existing ?? crypto.randomUUID();
    if (!existing) requestIds.set(req, requestId);
    const url = new URL(req.url);
    return runWithRequestSpan(
      requestId,
      { route: url.pathname, method: req.method },
      async (finish) => {
        const res = await handler(req, server);
        finish({ "http.response.status_code": res.status });
        return res;
      },
    );
  };
}
