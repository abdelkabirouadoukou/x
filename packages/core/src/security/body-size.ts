/**
 * Request body size enforcement.
 *
 * The framework buffers whatever a route, server function, or API handler asks
 * for (`req.json()`, `req.text()`, `req.formData()`, ...) in memory before any
 * validation runs. Without a byte budget an attacker can POST an arbitrarily
 * large body and drive the single Bun process toward OOM — the exact crash
 * class the hardening work on #85 is trying to contain. This module gives
 * `createApp` a `maxBodySize` knob applied ahead of route/action dispatch.
 */

export const DEFAULT_MAX_BODY_SIZE = 1_048_576;

/**
 * The error a wrapped request body stream is rejected with the moment it
 * exceeds the configured `maxBodySize`. Kept distinct from a generic stream
 * error so dispatch paths can map it to a 413 instead of a generic 500.
 */
export class RequestBodyTooLargeError extends Error {
  readonly maxBytes: number;

  constructor(maxBytes: number) {
    super(`Request body exceeds the ${maxBytes} byte limit`);
    this.name = "RequestBodyTooLargeError";
    this.maxBytes = maxBytes;
  }
}

function isBodylessMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

/**
 * Enforces `maxBytes` on a request body.
 *
 * - When `Content-Length` is declared and exceeds the limit, the request is
 *   rejected immediately with a 413 `Response`.
 * - When `Content-Length` is absent (chunked transfer) the body is wrapped in
 *   a counting stream that errors with {@link RequestBodyTooLargeError} the
 *   instant the limit is crossed. The wrapper only pulls from the source as
 *   fast as the downstream consumer reads, so an oversized body is aborted
 *   before it is ever fully buffered, instead of being read wholesale.
 *
 * Returns the (possibly wrapped) request, or a 413 `Response` when the
 * declared size is already over the limit.
 */
export function enforceRequestBodySize(req: Request, maxBytes: number): Request | Response {
  if (isBodylessMethod(req.method)) return req;

  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return new Response("Payload too large", {
        status: 413,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    // Under (or equal to) the declared budget: hand the original request
    // through untouched so body reading stays zero-cost for legitimate traffic.
    return req;
  }

  const source = req.body;
  if (source === null) return req;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  let total = 0;

  const pump = async () => {
    const reader = source.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          // Stop reading the source — this is the abort-before-buffering half.
          await reader.cancel().catch(() => {});
          await writer.abort(new RequestBodyTooLargeError(maxBytes));
          return;
        }
        await writer.write(value);
      }
      await writer.close();
    } catch (err) {
      await writer.abort(err);
    }
  };
  void pump();

  return new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: readable,
  });
}
