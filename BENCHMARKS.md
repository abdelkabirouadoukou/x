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

# Enforce SLOs (exit non-zero on violation) — what CI runs
bun scripts/bench/load.ts --slo
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

## SLOs (the performance contract)

The load test gates the build in CI (`bench` job, `--slo`). These are the
agreed targets; a run that misses any of them fails the PR:

| SLO | Target | Meaning |
|---|---|---|
| p95 SSR page latency | **< 500 ms** | server-mode page with a loader, rendered end-to-end |
| p95 server-function latency | **< 500 ms** | JSON round-trip through `/__x/actions/*` incl. CSRF check |
| Error rate | **< 0.1 %** of requests | any ≥ 500 response or thrown fetch in a scenario window |

Thresholds are deliberately loose versus the baseline table below: CI runners
are shared and 2–4× slower than a local Apple-Silicon Mac, and the point of the
gate is to catch a real regression (a 3–10× blow-up), not to flake on runner
noise. Violations are reported as `✗ scenario: p95 latency Xms exceeds SLO 500ms`.

Run the gate locally with:

```bash
bun scripts/bench/load.ts --slo
```

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

The `bench` job in `.github/workflows/ci.yml` runs the load test on every PR
**with `--slo`, and gates the merge**: `continue-on-error` was removed, so a
run that misses an SLO (or produces 500s, or breaks the rate limiter) fails the
job. See the SLO table above for the contract.
