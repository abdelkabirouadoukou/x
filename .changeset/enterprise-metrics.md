---
"@thexjs/core": minor
---

Add production-grade observability metrics: `createInMemoryMetrics()` (an in-process registry serving `/metrics` in Prometheus text format), `createOtlpMetricsReporter()` (forwards counters/histograms to an OpenTelemetry meter), and `withRequestMetrics()`. When passed as `observability.metrics` to `createApp`, every request records `x_http_requests_total`, `x_http_request_duration_ms`, and `x_http_errors_total` (plus `x_rate_limit_rejections_total`), and a `/metrics` endpoint is served ahead of routing when the reporter exposes one.
