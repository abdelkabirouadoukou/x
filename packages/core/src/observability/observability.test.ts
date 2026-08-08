import { afterEach, describe, expect, test } from "bun:test";
import { createHealthCheckHandler } from "./health";
import { withRequestLogging } from "./logger";
import {
  createInMemoryMetrics,
  createOtlpMetricsReporter,
  noopMetrics,
  withRequestMetrics,
} from "./metrics";
import {
  combineReporters,
  getErrorReporter,
  noopReporter,
  reportException,
  setErrorReporter,
} from "./monitoring";

describe("health checks", () => {
  test("/healthz always returns 200 ok", async () => {
    const handler = createHealthCheckHandler();
    const res = await handler(new Request("https://example.com/healthz"));
    expect(res?.status).toBe(200);
    const body = await res?.json();
    expect(body.status).toBe("ok");
  });

  test("/readyz returns 200 when all checks pass", async () => {
    const handler = createHealthCheckHandler({ checks: { database: () => true } });
    const res = await handler(new Request("https://example.com/readyz"));
    expect(res?.status).toBe(200);
    const body = await res?.json();
    expect(body).toEqual({ status: "ok", checks: { database: "ok" } });
  });

  test("/readyz returns 503 when a check fails", async () => {
    const handler = createHealthCheckHandler({
      checks: { database: () => false, cache: () => true },
    });
    const res = await handler(new Request("https://example.com/readyz"));
    expect(res?.status).toBe(503);
    const body = await res?.json();
    expect(body.status).toBe("error");
    expect(body.checks.database).toBe("error");
    expect(body.checks.cache).toBe("ok");
  });

  test("/readyz treats a thrown check as a failure, not a crash", async () => {
    const handler = createHealthCheckHandler({
      checks: {
        database: () => {
          throw new Error("connection refused");
        },
      },
    });
    const res = await handler(new Request("https://example.com/readyz"));
    expect(res?.status).toBe(503);
  });

  test("returns null for unrelated paths", async () => {
    const handler = createHealthCheckHandler();
    const res = await handler(new Request("https://example.com/dashboard"));
    expect(res).toBeNull();
  });
});

describe("error reporter", () => {
  afterEach(() => {
    setErrorReporter(noopReporter);
  });

  test("reportException forwards to the active reporter", () => {
    const captured: Array<{ error: unknown; phase: string }> = [];
    setErrorReporter({
      captureException(error, context) {
        captured.push({ error, phase: context.phase });
      },
    });

    reportException(new Error("boom"), { phase: "ssr", route: "/dashboard" });
    expect(captured.length).toBe(1);
    expect(captured[0]?.phase).toBe("ssr");
  });

  test("a reporter that throws does not propagate", () => {
    setErrorReporter({
      captureException() {
        throw new Error("reporter is broken");
      },
    });
    expect(() => reportException(new Error("boom"), { phase: "action" })).not.toThrow();
  });

  test("combineReporters fans out to every reporter", () => {
    const calls: string[] = [];
    const reporter = combineReporters(
      { captureException: () => calls.push("a") },
      { captureException: () => calls.push("b") },
    );
    reporter.captureException(new Error("x"), { phase: "api" });
    expect(calls).toEqual(["a", "b"]);
  });

  test("getErrorReporter reflects the currently active reporter", () => {
    const custom = { captureException: () => {} };
    setErrorReporter(custom);
    expect(getErrorReporter()).toBe(custom);
  });
});

describe("request logging", () => {
  test("passes through the wrapped handler's response and adds a request id", async () => {
    const handler = withRequestLogging(async () => new Response("ok", { status: 200 }));
    const res = await handler(new Request("https://example.com/about"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  test("preserves an incoming x-request-id instead of generating a new one", async () => {
    const handler = withRequestLogging(async () => new Response("ok"));
    const res = await handler(
      new Request("https://example.com/about", { headers: { "x-request-id": "req-123" } }),
    );
    expect(res.headers.get("x-request-id")).toBe("req-123");
  });

  test("still rejects when the wrapped handler throws", async () => {
    const handler = withRequestLogging(async () => {
      throw new Error("boom");
    });
    await expect(handler(new Request("https://example.com/about"))).rejects.toThrow("boom");
  });
});

describe("metrics registry", () => {
  test("counters accumulate per label set", () => {
    const metrics = createInMemoryMetrics();
    metrics.incr("x_http_requests_total", 1, { method: "GET" });
    metrics.incr("x_http_requests_total", 1, { method: "GET" });
    metrics.incr("x_http_requests_total", 1, { method: "POST" });

    const snap = metrics.snapshot();
    expect(snap.counters).toHaveLength(2);
    const get = snap.counters.find((c) => c.labels.method === "GET");
    expect(get?.value).toBe(2);
    const post = snap.counters.find((c) => c.labels.method === "POST");
    expect(post?.value).toBe(1);
  });

  test("histograms record cumulative buckets, sum and count", () => {
    const metrics = createInMemoryMetrics({ histogramBuckets: [10, 50, 100] });
    metrics.observe("x_http_request_duration_ms", 5, { method: "GET" });
    metrics.observe("x_http_request_duration_ms", 40, { method: "GET" });
    metrics.observe("x_http_request_duration_ms", 500, { method: "GET" });

    const snap = metrics.snapshot();
    const h = snap.histograms.find((x) => x.name === "x_http_request_duration_ms");
    expect(h?.count).toBe(3);
    expect(h?.sum).toBe(545);
    // le=10: 1 (the 5ms sample); le=50: 2; le=100: 2; +Inf: 3
    expect(h?.bucketCounts).toEqual([1, 2, 2]);
  });

  test("renderMetrics emits Prometheus text format with escaped labels", () => {
    const metrics = createInMemoryMetrics({ histogramBuckets: [10] });
    metrics.incr("x_http_requests_total", 2, { method: "GET", status: "200" });
    metrics.observe("x_http_request_duration_ms", 4, { method: "GET" });

    const text = metrics.renderMetrics();
    expect(text).toContain("# TYPE x_http_requests_total counter");
    expect(text).toContain('x_http_requests_total{method="GET",status="200"} 2');
    expect(text).toContain("# TYPE x_http_request_duration_ms histogram");
    expect(text).toContain('x_http_request_duration_ms_bucket{method="GET",le="10"} 1');
    expect(text).toContain('x_http_request_duration_ms_bucket{method="GET",le="+Inf"} 1');
    expect(text).toContain('x_http_request_duration_ms_sum{method="GET"} 4');
    expect(text).toContain('x_http_request_duration_ms_count{method="GET"} 1');
  });

  test("handleMetrics answers only /metrics", async () => {
    const metrics = createInMemoryMetrics();
    const res = await metrics.handleMetrics?.(new Request("https://example.com/metrics"));
    expect(res?.status).toBe(200);
    expect(res?.headers.get("content-type")).toContain("text/plain");

    const other = await metrics.handleMetrics?.(new Request("https://example.com/dashboard"));
    expect(other).toBeNull();
  });

  test("withRequestMetrics records count, latency and status", async () => {
    const metrics = createInMemoryMetrics();
    const handler = withRequestMetrics(metrics, async () => new Response("ok", { status: 201 }));
    await handler(new Request("https://example.com/create", { method: "POST" }));

    const snap = metrics.snapshot();
    const req = snap.counters.find((c) => c.name === "x_http_requests_total");
    expect(req?.value).toBe(1);
    expect(req?.labels.method).toBe("POST");
    expect(req?.labels.status).toBe("201");
    const dur = snap.histograms.find((c) => c.name === "x_http_request_duration_ms");
    expect(dur?.count).toBe(1);
    expect(dur?.sum).toBeGreaterThanOrEqual(0);
  });

  test("withRequestMetrics records errors when the handler throws", async () => {
    const metrics = createInMemoryMetrics();
    const handler = withRequestMetrics(metrics, async () => {
      throw new Error("boom");
    });
    await expect(handler(new Request("https://example.com/boom"))).rejects.toThrow("boom");

    const snap = metrics.snapshot();
    const errors = snap.counters.find((c) => c.name === "x_http_errors_total");
    expect(errors?.value).toBe(1);
    const req = snap.counters.find((c) => c.name === "x_http_requests_total");
    expect(req?.labels.status).toBe("500");
  });

  test("noopMetrics swallows without throwing", () => {
    expect(() => {
      noopMetrics.incr("a");
      noopMetrics.observe("b", 1);
    }).not.toThrow();
  });
});

describe("otlp metrics reporter", () => {
  test("forwards counters and histograms to the meter", () => {
    const counterAdds: Array<{ value: number; attrs?: Record<string, string> | undefined }> = [];
    const histogramRecords: Array<{ value: number; attrs?: Record<string, string> | undefined }> =
      [];
    const reporter = createOtlpMetricsReporter({
      createCounter(name, opts) {
        expect(name).toBe("x_http_requests_total");
        expect(opts?.description).toContain("Counter");
        return { add: (value, attrs) => counterAdds.push({ value, attrs }) };
      },
      createHistogram(name, opts) {
        expect(name).toBe("x_http_request_duration_ms");
        expect(opts?.description).toContain("Histogram");
        return { record: (value, attrs) => histogramRecords.push({ value, attrs }) };
      },
    });

    reporter.incr("x_http_requests_total", 1, { method: "GET" });
    reporter.observe("x_http_request_duration_ms", 42, { method: "GET" });

    expect(counterAdds).toEqual([{ value: 1, attrs: { method: "GET" } }]);
    expect(histogramRecords).toEqual([{ value: 42, attrs: { method: "GET" } }]);
  });
});
