import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Observability</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Observability</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        x includes production-ready observability out of the box: structured JSON logging, container
        health/readiness probes, request metrics (Prometheus or OpenTelemetry), and pluggable APM
        error tracing. All of it is optional and configurable via the{" "}
        <span className="text-foreground">observability</span> key in{" "}
        <span className="text-foreground">x.config.ts</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Configuration overview</h2>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig, createSentryReporter } from "@thexjs/core";
import * as Sentry from "@sentry/bun";

Sentry.init({ dsn: process.env.SENTRY_DSN });

export default defineConfig({
  // ...pagesDir, apiDir, etc.
  observability: {
    logging: true,
    errorReporter: createSentryReporter(Sentry),
    health: {
      checks: {
        database: () => db.ping(),
      },
    },
  },
});`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Structured JSON logging</h2>
      <p className="mt-3 text-muted-foreground">
        Every request is logged as one JSON line with{" "}
        <span className="text-foreground">timestamp</span>,{" "}
        <span className="text-foreground">requestId</span>,{" "}
        <span className="text-foreground">route</span>,{" "}
        <span className="text-foreground">method</span>,{" "}
        <span className="text-foreground">status</span>, and{" "}
        <span className="text-foreground">durationMs</span>. This is ready to ingest into Datadog,
        Grafana Loki, Kibana, or any JSON log pipeline.
      </p>
      <CodeBlock
        label="log output"
        lang="json"
        code={`{"timestamp":"2026-07-29T12:00:00.000Z","level":"info","message":"request completed","requestId":"abc-123","route":"/api/users","method":"GET","status":200,"durationMs":42}`}
      />
      <p className="mt-4 text-muted-foreground">
        Logging is enabled by default. Disable it with{" "}
        <span className="text-foreground">logging: false</span>.
      </p>
      <CodeBlock
        label="disable logging"
        code={`observability: {
  logging: false,
}`}
      />
      <p className="mt-4 text-muted-foreground">
        You can also use the <span className="text-foreground">logger</span> export directly in
        loaders, server functions, and API routes:
      </p>
      <CodeBlock
        label="manual logging"
        code={`import { logger } from "@thexjs/core";

export async function loader() {
  logger.info("fetching users", { userId: 42 });
  const users = await getUsers();
  logger.info("users fetched", { count: users.length });
  return { users };
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Health &amp; readiness probes</h2>
      <p className="mt-3 text-muted-foreground">
        Two endpoints are served ahead of all routing for container orchestrators:
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">/healthz</span>, the liveness probe. Returns{" "}
          <span className="text-foreground">{'{ status: "ok" }'}</span> when the Bun process is up
          and serving.
        </li>
        <li>
          <span className="text-foreground">/readyz</span>, the readiness probe. Runs all configured
          checks and returns <span className="text-foreground">200</span> only if every check
          passes, or <span className="text-foreground">503</span> otherwise.
        </li>
      </ul>
      <CodeBlock
        label="health checks"
        code={`observability: {
  health: {
    checks: {
      database: async () => {
        try {
          await db.query("SELECT 1");
          return true;
        } catch {
          return false;
        }
      },
      redis: () => redis.ping(),
    },
  },
}`}
      />
      <p className="mt-4 text-muted-foreground">
        Kubernetes/Docker can poll these endpoints to decide whether to send traffic to a pod or
        restart it. The handler itself is exported as{" "}
        <span className="text-foreground">createHealthCheckHandler</span> if you want to wire these
        endpoints into a custom server instead.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Request metrics</h2>
      <p className="mt-3 text-muted-foreground">
        x can record production metrics for every request — counts, latency histograms, and error
        and rate-limit-rejection counters. Two built-in reporters cover the two standard
        destinations:
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">createInMemoryMetrics()</span> — an in-process registry
          that serves a <span className="text-foreground">/metrics</span> endpoint in Prometheus
          text format, ready to be scraped by Prometheus/Grafana.
        </li>
        <li>
          <span className="text-foreground">createOtlpMetricsReporter(meter)</span> — forwards
          counters and histograms to an OpenTelemetry meter from your own OTel SDK setup (e.g. an
          OTLP exporter to Grafana Tempo/Cloud, Datadog, or Honeycomb).
        </li>
      </ul>
      <CodeBlock
        label="prometheus"
        code={`import { createInMemoryMetrics } from "@thexjs/core";

observability: {
  metrics: createInMemoryMetrics(),
}

// GET /metrics
// # TYPE x_http_requests_total counter
// x_http_requests_total{method="GET",status="200"} 42`}
      />
      <CodeBlock
        label="open-telemetry"
        code={`import { createOtlpMetricsReporter } from "@thexjs/core";
import { metrics } from "@opentelemetry/api";

observability: {
  metrics: createOtlpMetricsReporter(metrics.getMeter("x")),
}`}
      />
      <p className="mt-4 text-muted-foreground">
        The metrics recorded per request are{" "}
        <span className="text-foreground">x_http_requests_total</span> (labels{" "}
        <span className="text-foreground">method</span>,{" "}
        <span className="text-foreground">status</span>),{" "}
        <span className="text-foreground">x_http_request_duration_ms</span> (histogram, label{" "}
        <span className="text-foreground">method</span>),{" "}
        <span className="text-foreground">x_http_errors_total</span> (per phase), and{" "}
        <span className="text-foreground">x_rate_limit_rejections_total</span> (per method).
      </p>
      <p className="mt-4 text-muted-foreground">
        The same pieces are exported for custom wiring:{" "}
        <span className="text-foreground">withRequestMetrics(reporter, handler)</span> wraps any
        fetch handler, and any object implementing the{" "}
        <span className="text-foreground">MetricsReporter</span> interface works — including your
        own exporter that posts to a statsd/Prometheus push gateway.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">APM error tracing</h2>
      <p className="mt-3 text-muted-foreground">
        When an uncaught exception occurs during SSR, a server action, or an API handler, x reports
        it to the configured error reporter. Two reporters are built in:
      </p>
      <CodeBlock
        label="reporters"
        code={`import { createSentryReporter, createOtelReporter } from "@thexjs/core";

// Sentry
observability: {
  errorReporter: createSentryReporter(Sentry),
}

// OpenTelemetry
observability: {
  errorReporter: createOtelReporter(trace.getTracer("x")),
}`}
      />
      <p className="mt-4 text-muted-foreground">
        You can also combine multiple reporters, or write your own by implementing the{" "}
        <span className="text-foreground">ErrorReporter</span> interface:
      </p>
      <CodeBlock
        label="custom reporter"
        code={`import { combineReporters } from "@thexjs/core";

const customReporter = {
  captureException(error, context) {
    // Send to your own error tracking service
    fetch("https://errors.example.com", {
      method: "POST",
      body: JSON.stringify({ error: String(error), context }),
    });
  },
};

observability: {
  errorReporter: combineReporters(
    createSentryReporter(Sentry),
    customReporter,
  ),
}`}
      />
      <p className="mt-4 text-muted-foreground">
        If no reporter is configured, errors are logged to the console and the request returns a
        generic 500. The reporter never blocks the response. If it throws, the error is caught and
        logged so it can't take down the request.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Low-level APIs</h2>
      <p className="mt-3 text-muted-foreground">
        The pieces behind the config are exported directly, so you can swap the wiring for custom
        logic:
      </p>
      <CodeBlock
        label="low-level"
        code={`import {
  setErrorReporter,
  reportException,
  combineReporters,
  createSentryReporter,
} from "@thexjs/core";

setErrorReporter(combineReporters(createSentryReporter(Sentry), customReporter));

try {
  // ...
} catch (error) {
  reportException(error, { route: "/dashboard", phase: "loader" });
}`}
      />
      <p className="mt-4 text-muted-foreground">
        <span className="text-foreground">setErrorReporter</span> installs a reporter at runtime,
        <span className="text-foreground"> reportException</span> fires it with an{" "}
        <span className="text-foreground">ErrorContext</span>, and{" "}
        <span className="text-foreground">combineReporters</span> fans an exception out to several
        reporters at once. Reporters may also implement an optional{" "}
        <span className="text-foreground">flush()</span> (used to drain buffered events on graceful
        shutdown).
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">What's captured</h2>
      <p className="mt-3 text-muted-foreground">
        Every error report includes the <span className="text-foreground">phase</span> it occurred
        in:
      </p>
      <CodeBlock
        label="ErrorContext"
        code={`interface ErrorContext {
  route?: string;          // e.g. "/dashboard"
  requestId?: string;      // matches the log entry for this request
  phase: "ssr" | "action" | "api" | "loader";
}`}
      />

      <div className="mt-16 border-t border-border pt-8">
        <a
          href="/docs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to docs
        </a>
      </div>
    </div>
  );
}
