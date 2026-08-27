import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Observability</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">
        Request tracing
      </h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Instrument your application with request-scoped spans. Every trace carries a correlation id,
        and spans created inside a traced request inherit it automatically, so you can drill from a
        log line into a waterfall trace in your APM.
      </p>

      <h2 className="text-xl">How tracing works</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The tracing layer is a lightweight wrapper around OpenTelemetry-compatible tracers. X never
        initializes an OTel SDK — your application provides a tracer whose interface matches the
        small <span className="text-foreground">TracerLike</span> surface (the real OTel{" "}
        <span className="text-foreground">startSpan</span> method works). When no tracer is
        configured, every tracing call is a synchronous no-op with zero overhead.
      </p>

      <h2 className="text-xl">Setting up a tracer</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Call <span className="text-foreground">setTracer</span> once at application startup with
        your OTel tracer. Then wrap your request handler with{" "}
        <span className="text-foreground">withRequestTracing</span> to create an{" "}
        <span className="text-foreground">x.http</span> root span for every request:
      </p>
      <CodeBlock
        label="src/server.ts"
        code={`import { setTracer, withRequestTracing } from "@thexjs/core";
import { trace } from "@opentelemetry/api";

// Your OTel SDK setup — initialise the provider first
const otelTracer = trace.getTracer("my-app");
setTracer(otelTracer);

// Wrap the framework's own request handler
const app = createApp({ ... });
Bun.serve({
  fetch: withRequestTracing((req) => app.fetch(req)),
  port: 3000,
});`}
      />
      <p className="mt-4 text-muted-foreground">
        Every incoming request now gets an <span className="text-foreground">x.http</span> root span
        with attributes <span className="text-foreground">route</span>,{" "}
        <span className="text-foreground">method</span>,{" "}
        <span className="text-foreground">x.requestId</span>, and (once the response is written){" "}
        <span className="text-foreground">http.response.status_code</span>.
      </p>

      <h2 className="text-xl">Instrumenting loaders and actions</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Use <span className="text-foreground">tracePhase</span> to create child spans inside your
        loaders and server functions. The span inherits the current request's correlation id
        automatically:
      </p>
      <CodeBlock
        label="src/pages/dashboard.tsx — loader with tracing"
        code={`import { tracePhase } from "@thexjs/core";

export async function loader({}: LoaderArgs) {
  const users = await tracePhase("fetch.users", { "db.table": "users" }, async () => {
    return db.query("SELECT * FROM users ORDER BY created_at DESC").all();
  });

  return { users };
}`}
      />
      <p className="mt-4 text-muted-foreground">
        If the request is not being traced (e.g. a build-time render or a background job),{" "}
        <span className="text-foreground">tracePhase</span> runs the function with zero overhead —
        no span is created. For synchronous work, use{" "}
        <span className="text-foreground">tracePhaseSync</span> with the same signature.
      </p>

      <h2 className="text-xl">Database trace attributes</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The <span className="text-foreground">dbTraceAttributes</span> helper builds a standard set
        of DB-span attributes — system, operation, and a redacted statement — for use with any
        database driver:
      </p>
      <CodeBlock
        label="src/lib/db.ts"
        code={`import { tracePhase, dbTraceAttributes } from "@thexjs/core";

function queryUsers() {
  return tracePhase("db.query", dbTraceAttributes("sqlite", "SELECT * FROM users WHERE id = ?"), async () => {
    return db.query("SELECT * FROM users WHERE id = ?").all();
  });
}`}
      />
      <p className="mt-4 text-muted-foreground">
        The statement has its quoted literals masked (so bound parameters never appear in traces)
        and is truncated to 512 characters. The redaction layer also strips
        bearer/authorization-shaped patterns before the attribute is set.
      </p>

      <h2 className="text-xl">Error status codes</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        When an instrumented phase throws, the span is marked with error status and the exception is
        recorded. The <span className="text-foreground">OTEL_ERROR_STATUS_CODE</span> constant
        matches OpenTelemetry's <span className="text-foreground">SpanStatusCode.ERROR</span> ({2})
        for when you need to set error status yourself:
      </p>
      <CodeBlock
        label="manual error handling"
        code={`import { OTEL_ERROR_STATUS_CODE, getTracer } from "@thexjs/core";

const span = getTracer().startSpan("custom.work");
try {
  const result = doWork();
  span.end();
  return result;
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: OTEL_ERROR_STATUS_CODE, message: String(error) });
  span.end();
  throw error;
}`}
      />

      <h2 className="text-xl">Low-level APIs</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        For advanced use cases — writing a custom server, running background jobs, or instrumenting
        non-request code — the underlying primitives are exported directly:
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">runWithRequestSpan(requestId, attributes, work)</span>{" "}
          runs work inside a root span and an AsyncLocalStorage context, returning the work's value.
        </li>
        <li>
          <span className="text-foreground">traceRequestId(req)</span> returns the request id a
          given Request is traced under, minting one if none exists.
        </li>
        <li>
          <span className="text-foreground">setTracer(tracer)</span> and{" "}
          <span className="text-foreground">getTracer()</span> manage the active tracer globally.
        </li>
      </ul>

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
