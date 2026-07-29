import { afterEach, describe, expect, test } from "bun:test";
import { createHealthCheckHandler } from "./health";
import {
  combineReporters,
  getErrorReporter,
  noopReporter,
  reportException,
  setErrorReporter,
} from "./monitoring";
import { withRequestLogging } from "./logger";

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
