# Benchmarks

How the x framework's request pipeline behaves under load. These are honest
numbers from a specific machine and workload — treat them as a baseline and a
methodology, not a guarantee. Re-run `bun scripts/bench/load.ts` on your own
hardware before making performance claims.

## Running the benchmark

```bash
# Full default run (32 concurrent, 5s per scenario)
bun scripts/bench/load.ts

# Customize
bun scripts/bench/load.ts --concurrency 50 --duration 3 --route /about
```

The script boots a real production-mode app — the same `createApp().fetch`
pipeline `x start` hands every request — over a real socket via `Bun.serve`,
then measures:

1. **SSR page throughput + latency** (default route: `/about`, a server-mode
   page whose loader returns a 10-item array, rendered through layouts and
   JSX).
2. **Server-function throughput** (`POST /__x/actions/...`, including the CSRF
   origin check).
3. **Rate-limiter behavior under burst** (limit 10/60s, 100 rapid attempts →
   expect exactly 10 allowed, 90 rejected).

Machine-readable JSON results are written to `scripts/bench/results/`.

## Methodology

- **Client**: plain `fetch` loops at fixed concurrency for a fixed duration.
  No keep-alive pooling tricks, no connection reuse beyond what `fetch`
  defaults do.
- **Latency percentiles**: computed from every response's `performance.now()`
  delta; p50/p95/p99 are reported.
- **RPS**: total completed requests ÷ wall-clock duration.
- **Errors**: responses with status ≥ 500 (or thrown fetches). The run exits
  non-zero if any scenario produces server errors or the rate limiter
  misbehaves, so a regression turns into a CI failure.
- The framework's security headers and request logging are disabled in the
  harness so the numbers reflect the pipeline's own cost; run with them on for
  a worst-case estimate.

## Baseline results

Hardware: macOS (Apple Silicon), Bun 1.3.14, 32 concurrent clients, 2s warm
scenario per the run below (longer runs produce tighter p99s).

| Scenario | RPS | p50 | p95 | p99 | Errors |
|---|---|---|---|---|---|
| SSR page (`GET /about`) | ~3,000 | ~3.7ms | ~39.5ms | ~98.8ms | 0 |
| Server function (`POST /__x/actions/...`) | ~3,800 | ~4.4ms | ~22.9ms | ~41.4ms | 0 |
| Rate-limit burst (limit 10/60s, 100 req) | — | — | — | — | 10 allowed / 90 rejected |

Notes:

- SSR pages are the heaviest path (loader + JSX render + layout wrapping);
  server functions are pure JSON round-trips, hence faster.
- p95/p99 here are inflated by the fixed-duration harness: at 32 concurrency
  the client side of the bench (not the server) is the bottleneck. Rerun with
  `--concurrency 8` for tighter tail latencies.

## CI

A non-blocking CI job (`bench`) runs the load test on every PR. It reports the
numbers but does not gate the merge — the framework's own `bun test` suite is
the gate. The job fails only on hard failures (500s under load or a rate
limiter that stops enforcing its limit), not on raw speed, since that varies
with the runner's hardware.
