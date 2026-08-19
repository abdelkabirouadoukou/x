/**
 * Plugin hook for capturing unhandled exceptions during SSR and server
 * action execution, and exporting them to an APM provider. `@thexjs/core`
 * has no hard dependency on Sentry or OpenTelemetry — apps opt in by
 * installing the relevant package and constructing a reporter; everything
 * here degrades to a no-op if nothing is configured.
 */

export interface ErrorContext {
  route?: string;
  requestId?: string;
  phase: "ssr" | "action" | "api" | "loader";
  /** Free-form discriminator, e.g. `hydration-mismatch`, for filtering. */
  tag?: string;
}

export interface ErrorReporter {
  captureException(error: unknown, context: ErrorContext): void;
  /** Optional: flush buffered events, e.g. on graceful shutdown. */
  flush?(): Promise<void>;
}

/** No-op reporter used when no APM integration is configured. */
export const noopReporter: ErrorReporter = {
  captureException: () => {},
};

let activeReporter: ErrorReporter = noopReporter;

export function setErrorReporter(reporter: ErrorReporter): void {
  activeReporter = reporter;
}

export function getErrorReporter(): ErrorReporter {
  return activeReporter;
}

export function reportException(error: unknown, context: ErrorContext): void {
  try {
    activeReporter.captureException(error, context);
  } catch (reportingError) {
    // Never let a broken reporter take down the request.
    console.error("[x] error reporter threw while handling an exception:", reportingError);
  }
}

/**
 * Minimal shape of the Sentry Node/Bun SDK surface this integration needs.
 * Avoids a hard dependency on `@sentry/*` — pass in the SDK's `Sentry` object
 * after calling `Sentry.init(...)` yourself.
 */
export interface SentryLike {
  captureException(error: unknown, hint?: { extra?: Record<string, unknown> }): string;
  flush?(timeoutMs?: number): Promise<boolean>;
}

export function createSentryReporter(sentry: SentryLike): ErrorReporter {
  return {
    captureException(error, context) {
      sentry.captureException(error, { extra: { ...context } });
    },
    async flush() {
      await sentry.flush?.(2000);
    },
  };
}

/**
 * Minimal shape of an OpenTelemetry tracer's span-recording surface this
 * integration needs. Pass in a tracer obtained from your own OTel SDK setup
 * (`trace.getTracer(...)`) — `@thexjs/core` never initializes OTel itself.
 */
export interface OtelSpanLike {
  recordException(error: unknown): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

export interface OtelTracerLike {
  startSpan(name: string): OtelSpanLike;
}

const OTEL_ERROR_STATUS_CODE = 2; // matches @opentelemetry/api's SpanStatusCode.ERROR

export function createOtelReporter(tracer: OtelTracerLike): ErrorReporter {
  return {
    captureException(error, context) {
      const span = tracer.startSpan(`x.${context.phase}.error`);
      span.recordException(error);
      span.setStatus({
        code: OTEL_ERROR_STATUS_CODE,
        message: error instanceof Error ? error.message : String(error),
      });
      span.end();
    },
  };
}

/** Combines multiple reporters — useful for sending to Sentry and OTel at once. */
export function combineReporters(...reporters: ErrorReporter[]): ErrorReporter {
  return {
    captureException(error, context) {
      for (const reporter of reporters) {
        try {
          reporter.captureException(error, context);
        } catch (err) {
          console.error("[x] error reporter threw while handling an exception:", err);
        }
      }
    },
    async flush() {
      await Promise.all(reporters.map((r) => r.flush?.()));
    },
  };
}
