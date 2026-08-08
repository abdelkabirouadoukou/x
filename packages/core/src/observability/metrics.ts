/**
 * Production-grade metrics: counters and histograms recorded per request and
 * exported either as Prometheus text at a `/metrics` endpoint or pushed to an
 * OpenTelemetry meter. `@thexjs/core` has no hard dependency on Prometheus or
 * OpenTelemetry — apps opt in by constructing a reporter; everything here
 * degrades to a no-op if nothing is configured. Mirrors the `ErrorReporter`
 * pattern in `./monitoring`.
 */

export interface MetricLabels {
  [key: string]: string;
}

export interface MetricsReporter {
  /** Increment a counter by `delta` (default 1). */
  incr(name: string, delta?: number, labels?: MetricLabels): void;
  /** Record an observation (e.g. latency in milliseconds) into a histogram. */
  observe(name: string, value: number, labels?: MetricLabels): void;
  /** Optional: flush buffered metrics, e.g. on graceful shutdown. */
  flush?(): Promise<void>;
  /**
   * Optional: answer a `/metrics` request (Prometheus text format). Return
   * `null` for any other path so it can be composed ahead of normal routing,
   * like `createHealthCheckHandler`.
   */
  handleMetrics?(req: Request): Promise<Response | null> | Response | null;
}

/** No-op reporter used when no metrics integration is configured. */
export const noopMetrics: MetricsReporter = {
  incr: () => {},
  observe: () => {},
};

export interface CounterSeries {
  name: string;
  labels: MetricLabels;
  value: number;
}

export interface HistogramSeries {
  name: string;
  labels: MetricLabels;
  /** Cumulative count per bucket, parallel to the reporter's bucket bounds. */
  bucketCounts: number[];
  sum: number;
  count: number;
}

export interface MetricsSnapshot {
  counters: CounterSeries[];
  histograms: HistogramSeries[];
}

/** Default latency bucket bounds (ms), used when a histogram has no explicit bounds. */
export const DEFAULT_HISTOGRAM_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export interface InMemoryMetricsOptions {
  /** Bucket bounds for histograms. Defaults to `DEFAULT_HISTOGRAM_BUCKETS_MS`. */
  histogramBuckets?: number[];
}

interface HistogramAccumulator {
  bucketCounts: number[];
  sum: number;
  count: number;
}

function seriesKey(name: string, labels: MetricLabels | undefined): string {
  if (!labels) return name;
  const sorted = Object.entries(labels)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`);
  return `${name}\x00${sorted.join("\x00")}`;
}

/**
 * In-process metrics registry with a `snapshot()` you can render or test
 * against, plus an optional `/metrics` handler in Prometheus text format.
 * The single object this returns is both a `MetricsReporter` and a handler
 * factory, so it can be passed straight to `createApp`'s `observability.metrics`
 * to get request metrics recorded and served.
 */
export function createInMemoryMetrics(options: InMemoryMetricsOptions = {}) {
  const buckets = options.histogramBuckets ?? DEFAULT_HISTOGRAM_BUCKETS_MS;
  const counters = new Map<string, CounterSeries>();
  const histograms = new Map<string, HistogramAccumulator>();

  function incr(name: string, delta = 1, labels?: MetricLabels): void {
    const key = seriesKey(name, labels);
    let series = counters.get(key);
    if (!series) {
      series = { name, labels: labels ?? {}, value: 0 };
      counters.set(key, series);
    }
    series.value += delta;
  }

  function observe(name: string, value: number, labels?: MetricLabels): void {
    const key = seriesKey(name, labels);
    let acc = histograms.get(key);
    if (!acc) {
      acc = { bucketCounts: new Array(buckets.length).fill(0), sum: 0, count: 0 };
      histograms.set(key, acc);
    }
    acc.sum += value;
    acc.count += 1;
    // Prometheus `le` buckets are cumulative: every bucket whose bound is
    // >= value gets incremented (and `+Inf` covers everything).
    for (let i = 0; i < buckets.length; i += 1) {
      const bound = buckets[i];
      if (bound === undefined) break;
      if (value <= bound) {
        for (let j = i; j < buckets.length; j += 1) {
          acc.bucketCounts[j] = (acc.bucketCounts[j] ?? 0) + 1;
        }
        break;
      }
    }
  }

  function labelsFromKey(key: string): { name: string; labels: MetricLabels } {
    const [name] = key.split("\x00");
    const labelPart = name !== undefined ? key.slice(name.length + 1) : "";
    const labels: MetricLabels = {};
    if (labelPart) {
      for (const pair of labelPart.split("\x00")) {
        const eq = pair.indexOf("=");
        if (eq > 0) labels[pair.slice(0, eq)] = pair.slice(eq + 1);
      }
    }
    return { name: name ?? key, labels };
  }

  function snapshot(): MetricsSnapshot {
    const sortedCounters = [...counters.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, series]) => {
        const { name, labels } = labelsFromKey(key);
        return { name, labels, value: series.value };
      });
    const sortedHistograms = [...histograms.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, acc]) => {
        const { name, labels } = labelsFromKey(key);
        return { name, labels, bucketCounts: acc.bucketCounts, sum: acc.sum, count: acc.count };
      });

    return { counters: sortedCounters, histograms: sortedHistograms };
  }

  function renderMetrics(): string {
    const snap = snapshot();
    const lines: string[] = [];

    for (const counter of snap.counters) {
      lines.push(`# TYPE ${counter.name} counter`);
      lines.push(`${counter.name}${formatLabels(counter.labels)} ${counter.value}`);
    }

    for (const h of snap.histograms) {
      const labelWithLe = (le: string) => {
        const labels = { ...h.labels, le };
        return formatLabels(labels);
      };
      lines.push(`# TYPE ${h.name} histogram`);
      for (let i = 0; i < buckets.length; i += 1) {
        lines.push(`${h.name}_bucket${labelWithLe(String(buckets[i]))} ${h.bucketCounts[i]}`);
      }
      lines.push(`${h.name}_bucket${labelWithLe("+Inf")} ${h.count}`);
      lines.push(`${h.name}_sum${formatLabels(h.labels)} ${h.sum}`);
      lines.push(`${h.name}_count${formatLabels(h.labels)} ${h.count}`);
    }

    return `${lines.join("\n")}\n`;
  }

  function handleMetrics(req: Request): Response | null {
    if (new URL(req.url).pathname !== "/metrics") return null;
    return new Response(renderMetrics(), {
      headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
    });
  }

  return {
    incr,
    observe,
    snapshot,
    renderMetrics,
    handleMetrics,
    async flush() {},
  };
}

export type InMemoryMetricsReporter = ReturnType<typeof createInMemoryMetrics>;

/**
 * The subset of an OpenTelemetry meter this integration needs. Pass a meter
 * from your own OTel SDK setup (`metrics.getMeter(...)`) — `@thexjs/core`
 * never initializes OTel itself. Mirrors `createOtelReporter`.
 */
export interface OtelMeterLike {
  createCounter(
    name: string,
    options?: { description?: string },
  ): {
    add(value: number, attributes?: MetricLabels): void;
  };
  createHistogram(
    name: string,
    options?: { description?: string },
  ): {
    record(value: number, attributes?: MetricLabels): void;
  };
}

/**
 * Forwards recorded metrics to an OpenTelemetry meter. Instruments are
 * created lazily on first use. No `/metrics` endpoint is served — export
 * happens through your OTel setup instead.
 */
export function createOtlpMetricsReporter(meter: OtelMeterLike): MetricsReporter {
  const counters = new Map<string, { add(value: number, attributes?: MetricLabels): void }>();
  const histograms = new Map<string, { record(value: number, attributes?: MetricLabels): void }>();

  return {
    incr(name, delta, labels) {
      let counter = counters.get(name);
      if (!counter) {
        counter = meter.createCounter(name, { description: `Counter ${name}` });
        counters.set(name, counter);
      }
      counter.add(delta ?? 1, labels);
    },
    observe(name, value, labels) {
      let histogram = histograms.get(name);
      if (!histogram) {
        histogram = meter.createHistogram(name, { description: `Histogram ${name}` });
        histograms.set(name, histogram);
      }
      histogram.record(value, labels);
    },
  };
}

function formatLabels(labels: MetricLabels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return "";
  const escaped = entries.map(([k, v]) => `${k}="${escapeLabelValue(v)}"`).join(",");
  return `{${escaped}}`;
}

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * Wraps a fetch handler so every request is measured: `x_http_requests_total`
 * (counter, labels `method`, `status`), `x_http_request_duration_ms`
 * (histogram, label `method`), and `x_http_errors_total` (counter) for requests
 * that throw. Composable ahead of routing, like `withRequestLogging`.
 */
export function withRequestMetrics<Server = unknown>(
  reporter: MetricsReporter,
  handler: (req: Request, server?: Server) => Response | Promise<Response>,
): (req: Request, server?: Server) => Promise<Response> {
  return async (req: Request, server?: Server) => {
    const start = performance.now();
    const method = req.method;
    try {
      const res = await handler(req, server);
      reporter.incr("x_http_requests_total", 1, { method, status: String(res.status) });
      reporter.observe("x_http_request_duration_ms", performance.now() - start, { method });
      return res;
    } catch (err) {
      reporter.incr("x_http_requests_total", 1, { method, status: "500" });
      reporter.incr("x_http_errors_total", 1, { method });
      reporter.observe("x_http_request_duration_ms", performance.now() - start, { method });
      throw err;
    }
  };
}
