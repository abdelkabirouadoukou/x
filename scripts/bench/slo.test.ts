import { describe, expect, test } from "bun:test";
import type { ScenarioResult } from "./slo";
import { DEFAULT_SLOS, evaluateSlo, formatViolations } from "./slo";

/**
 * Scripted proof for the "a regression against an SLO causes the job to fail"
 * acceptance criterion (#78): the same pure function the CI gate calls must
 * flag an over-limit run and pass a healthy one.
 */

function result(over: Partial<ScenarioResult>): ScenarioResult {
  return {
    name: "test",
    p95: 10,
    count: 1000,
    errors: 0,
    ...over,
  };
}

describe("evaluateSlo", () => {
  test("passes a healthy run within SLO", () => {
    const res = evaluateSlo([result({ p95: 84, count: 1000 })], DEFAULT_SLOS);
    expect(res.passed).toBe(true);
    expect(res.violations).toHaveLength(0);
  });

  test("fails when p95 latency regresses past the SLO", () => {
    const res = evaluateSlo(
      [{ name: "ssr-page", p95: DEFAULT_SLOS.p95Ms + 1, count: 1000, errors: 0 }],
      DEFAULT_SLOS,
    );
    expect(res.passed).toBe(false);
    expect(res.violations).toEqual([
      {
        scenario: "ssr-page",
        kind: "p95",
        actual: DEFAULT_SLOS.p95Ms + 1,
        limit: DEFAULT_SLOS.p95Ms,
        unit: "ms",
      },
    ]);
  });

  test("fails when the error rate regresses past the SLO", () => {
    const res = evaluateSlo([{ name: "server-fn", p95: 5, count: 1000, errors: 10 }], {
      ...DEFAULT_SLOS,
      maxErrorRate: 0.001,
    });
    expect(res.passed).toBe(false);
    expect(res.violations[0]).toMatchObject({
      scenario: "server-fn",
      kind: "error-rate",
    });
  });

  test("gates a run where nothing was served as an error-rate violation", () => {
    const res = evaluateSlo([result({ count: 0 })], DEFAULT_SLOS);
    expect(res.passed).toBe(false);
  });

  test("formatViolations renders the reporter output", () => {
    const out = formatViolations([
      { scenario: "ssr-page", kind: "p95", actual: 900, limit: 500, unit: "ms" },
    ]);
    expect(out).toContain("ssr-page");
    expect(out).toContain("900ms exceeds SLO 500ms");
  });
});
