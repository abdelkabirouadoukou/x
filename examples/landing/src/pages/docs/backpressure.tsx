import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock, TerminalBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Guides</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Backpressure</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Protect your process from overload by bounding the number of requests that can execute or
        queue concurrently. Backpressure is separate from rate limiting: rate limiting controls
        request frequency per identity, while backpressure bounds the total in-flight work inside
        one process at a time.
      </p>

      <h2 className="text-xl">Why backpressure matters</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        A sudden traffic spike can saturate your process with concurrent requests. Without
        backpressure, each new request adds more work to the event loop, degrading latency for
        everyone until the process becomes unresponsive or runs out of memory. The backpressure
        controller acts as an admission gate: it allows at most{" "}
        <span className="text-foreground">maxConcurrent</span> requests to execute at once and
        queues up to <span className="text-foreground">maxQueue</span> additional ones. When the
        queue is full, new requests are rejected immediately with a 503 Service Unavailable — a
        clean failure the caller can retry.
      </p>

      <h2 className="text-xl">Wrap a handler with withBackpressure</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The simplest way to add backpressure is to wrap your request handler with{" "}
        <span className="text-foreground">withBackpressure</span>. It returns a handler with the
        same signature, so it composes with other middleware:
      </p>
      <CodeBlock
        label="wrapping the fetch handler"
        code={`import { withBackpressure } from "@thexjs/core";

const app = createApp({ ... });

Bun.serve({
  fetch: withBackpressure((req) => app.fetch(req), {
    maxConcurrent: 50,   // process up to 50 requests at once
    maxQueue: 20,        // let 20 more wait for a slot
    retryAfterSeconds: 2, // Retry-After header when saturated
  }),
  port: 3000,
});`}
      />
      <TerminalBlock
        label="saturated response (503)"
        code={`HTTP/1.1 503 Service Unavailable
Content-Type: text/plain; charset=utf-8
Retry-After: 2

Service Unavailable`}
      />
      <p className="mt-4 text-muted-foreground">
        When the queue is full, new requests are rejected with{" "}
        <span className="text-foreground">503 Service Unavailable</span> (not 429 Too Many
        Requests): the caller is not being rate-limited; this specific process has no capacity left.
      </p>

      <h2 className="text-xl">Using the controller directly</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        For more control — e.g. to apply different limits per route or release a lease after a
        subtask — create a <span className="text-foreground">BackpressureController</span> with{" "}
        <span className="text-foreground">createBackpressureController</span> and call{" "}
        <span className="text-foreground">acquire</span> /{" "}
        <span className="text-foreground">release</span> manually:
      </p>
      <CodeBlock
        label="manual backpressure — per-route limits"
        code={`import { createBackpressureController } from "@thexjs/core";

// Separate controller for a heavyweight CPU-bound route
const heavyController = createBackpressureController({
  maxConcurrent: 5,
  maxQueue: 2,
});

// Separate controller for a fast I/O route
const lightController = createBackpressureController({
  maxConcurrent: 100,
  maxQueue: 50,
});

async function handleHeavyRoute(req: Request): Promise<Response> {
  const lease = await heavyController.acquire(req.signal);
  try {
    return await processHeavyTask(req);
  } finally {
    lease.release();
  }
}

async function handleLightRoute(req: Request): Promise<Response> {
  const lease = await lightController.acquire(req.signal);
  try {
    return await processLightTask(req);
  } finally {
    lease.release();
  }
}`}
      />

      <h2 className="text-xl">Handling saturated errors</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        When <span className="text-foreground">acquire</span> rejects with{" "}
        <span className="text-foreground">BackpressureSaturatedError</span>, the error includes a{" "}
        <span className="text-foreground">retryAfterSeconds</span> property so you can produce a
        compliant response:
      </p>
      <CodeBlock
        label="custom error handling"
        code={`import { createBackpressureController, BackpressureSaturatedError } from "@thexjs/core";

const controller = createBackpressureController({ maxConcurrent: 10, maxQueue: 5 });

async function handler(req: Request): Promise<Response> {
  try {
    const lease = await controller.acquire(req.signal);
    try {
      return await doWork(req);
    } finally {
      lease.release();
    }
  } catch (error) {
    if (error instanceof BackpressureSaturatedError) {
      return new Response("Too many requests in-flight, please wait", {
        status: 503,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      });
    }
    throw error; // re-throw abort errors, etc.
  }
}`}
      />

      <h2 className="text-xl">Monitoring the controller</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Call <span className="text-foreground">snapshot()</span> at any time to inspect the
        controller's state. This is useful for metrics endpoints or health checks:
      </p>
      <CodeBlock
        label="metrics snapshot"
        code={`import { createBackpressureController } from "@thexjs/core";

const controller = createBackpressureController({ maxConcurrent: 50, maxQueue: 20 });

// Expose as a /metrics endpoint or log periodically
function getBackpressureMetrics() {
  const s = controller.snapshot();
  return {
    active_requests: s.active,
    queued_requests: s.queued,
    max_concurrent: s.maxConcurrent,
    max_queue: s.maxQueue,
    utilization_pct: Math.round((s.active / s.maxConcurrent) * 100),
  };
}`}
      />

      <h2 className="text-xl">AbortSignal support</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        If the request's <span className="text-foreground">AbortSignal</span> fires while the
        request is waiting in the queue, it is removed from the queue and its promise rejects with
        the abort reason — it never invokes the upstream handler. This prevents queued work from
        executing for clients that have already disconnected.
      </p>

      <div className="mt-16 border-t border-border pt-8">
        <a
          href="/docs/observability"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Observability
        </a>
      </div>
    </div>
  );
}
