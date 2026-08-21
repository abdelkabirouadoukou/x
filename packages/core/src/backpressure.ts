export interface BackpressureOptions {
  /** Maximum number of requests allowed to execute concurrently in this process. */
  maxConcurrent: number;
  /** Maximum number of additional requests allowed to wait for a slot. Default: 0. */
  maxQueue?: number;
  /** Retry-After value used by `withBackpressure` when the queue is full. Default: 1 second. */
  retryAfterSeconds?: number;
}

export interface BackpressureSnapshot {
  active: number;
  queued: number;
  maxConcurrent: number;
  maxQueue: number;
}

export interface BackpressureLease {
  /** Releases one active slot. Safe to call more than once. */
  release(): void;
}

export interface BackpressureController {
  /**
   * Waits for an execution slot. Rejects with `BackpressureSaturatedError`
   * when the queue is full, or with the request's abort reason while queued.
   */
  acquire(signal?: AbortSignal): Promise<BackpressureLease>;
  snapshot(): BackpressureSnapshot;
}

export class BackpressureSaturatedError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Backpressure queue is full");
    this.name = "BackpressureSaturatedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface Waiter {
  signal: AbortSignal | undefined;
  resolve: (lease: BackpressureLease) => void;
  reject: (reason: unknown) => void;
  onAbort: (() => void) | undefined;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`${name} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer`);
  }
  return value;
}

function abortReason(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;
  return new DOMException("The operation was aborted", "AbortError");
}

/**
 * Creates one in-process admission controller.
 *
 * This is deliberately separate from rate limiting: rate limiting controls
 * request frequency per identity/window, while this controller bounds the
 * amount of work that may be active or waiting inside one process at a time.
 * Queued requests are promoted FIFO as active leases are released.
 */
export function createBackpressureController(
  options: BackpressureOptions,
): BackpressureController {
  const maxConcurrent = positiveInteger(options.maxConcurrent, "maxConcurrent");
  const maxQueue = nonNegativeInteger(options.maxQueue ?? 0, "maxQueue");
  const retryAfterSeconds = positiveInteger(options.retryAfterSeconds ?? 1, "retryAfterSeconds");
  const queue: Waiter[] = [];
  let active = 0;

  function detachAbort(waiter: Waiter): void {
    if (waiter.signal && waiter.onAbort) {
      waiter.signal.removeEventListener("abort", waiter.onAbort);
    }
  }

  function makeLease(): BackpressureLease {
    let released = false;
    return {
      release() {
        if (released) return;
        released = true;
        active -= 1;
        promote();
      },
    };
  }

  function promote(): void {
    while (active < maxConcurrent && queue.length > 0) {
      const waiter = queue.shift();
      if (!waiter) return;
      detachAbort(waiter);
      if (waiter.signal?.aborted) {
        waiter.reject(abortReason(waiter.signal));
        continue;
      }
      active += 1;
      waiter.resolve(makeLease());
    }
  }

  function acquire(signal?: AbortSignal): Promise<BackpressureLease> {
    if (signal?.aborted) return Promise.reject(abortReason(signal));

    if (active < maxConcurrent) {
      active += 1;
      return Promise.resolve(makeLease());
    }

    if (queue.length >= maxQueue) {
      return Promise.reject(new BackpressureSaturatedError(retryAfterSeconds));
    }

    return new Promise<BackpressureLease>((resolve, reject) => {
      const waiter: Waiter = {
        signal,
        resolve,
        reject,
        onAbort: undefined,
      };

      if (signal) {
        waiter.onAbort = () => {
          const index = queue.indexOf(waiter);
          if (index < 0) return;
          queue.splice(index, 1);
          detachAbort(waiter);
          reject(abortReason(signal));
        };
        signal.addEventListener("abort", waiter.onAbort, { once: true });
      }

      queue.push(waiter);
    });
  }

  return {
    acquire,
    snapshot() {
      return { active, queued: queue.length, maxConcurrent, maxQueue };
    },
  };
}

export type BackpressureHandler<TServer = unknown> = (
  req: Request,
  server?: TServer,
) => Response | Promise<Response>;

/**
 * Wraps a request handler with bounded per-process admission.
 *
 * Saturation is reported as 503 Service Unavailable (not 429): the caller is
 * not being rate-limited; this process has no execution/queue capacity left.
 * Requests aborted while waiting are removed from the queue and their abort
 * reason is re-thrown without invoking the wrapped handler.
 */
export function withBackpressure<TServer = unknown>(
  handler: BackpressureHandler<TServer>,
  options: BackpressureOptions,
): BackpressureHandler<TServer> {
  const controller = createBackpressureController(options);

  return async (req: Request, server?: TServer): Promise<Response> => {
    let lease: BackpressureLease;
    try {
      lease = await controller.acquire(req.signal);
    } catch (error) {
      if (error instanceof BackpressureSaturatedError) {
        return new Response("Service Unavailable", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Retry-After": String(error.retryAfterSeconds),
          },
        });
      }
      throw error;
    }

    try {
      return await handler(req, server);
    } finally {
      lease.release();
    }
  };
}
