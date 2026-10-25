import { describe, expect, test } from "bun:test";
import type { BackpressureOptions } from "./backpressure";
import { createApp } from "./application";

const WORK_URL = "http://localhost/api/work";

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function appWithHandler(
  handler: (req: Request) => Response | Promise<Response>,
  backpressure: BackpressureOptions | false,
) {
  return createApp({
    pagesDir: "/virtual/src/pages",
    development: false,
    security: { headers: false, rateLimit: false },
    observability: { logging: false },
    backpressure,
    preloaded: {
      routes: [
        {
          entry: {
            filePath: "/virtual/src/api/work.ts",
            routePath: "/api/work",
            paramNames: [],
            isApi: true,
          },
          mode: "server",
          module: { GET: handler },
          layoutModules: [],
          middlewareModules: [],
        },
      ],
    },
  });
}

describe("createApp backpressure wiring", () => {
  test("bounds active work, queues FIFO, and returns 503 + Retry-After when saturated", async () => {
    let unblock: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    let active = 0;
    let maxActive = 0;

    const app = await appWithHandler(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await blocked;
      active -= 1;
      return new Response("ok");
    }, { maxConcurrent: 1, maxQueue: 1, retryAfterSeconds: 4 });

    const first = app.fetch(new Request(WORK_URL));
    await tick();
    const second = app.fetch(new Request(WORK_URL));
    await tick();
    const saturated = await app.fetch(new Request(WORK_URL));

    expect(saturated.status).toBe(503);
    expect(saturated.headers.get("Retry-After")).toBe("4");
    expect(maxActive).toBe(1);

    unblock?.();
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
    expect(maxActive).toBe(1);
  });

  test("liveness and readiness probes bypass a saturated admission gate", async () => {
    let unblock: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });

    const app = await appWithHandler(async () => {
      await blocked;
      return new Response("ok");
    }, { maxConcurrent: 1, maxQueue: 0 });

    const running = app.fetch(new Request(WORK_URL));
    await tick();

    const health = await app.fetch(new Request("http://localhost/healthz"));
    const ready = await app.fetch(new Request("http://localhost/readyz"));
    expect(health.status).toBe(200);
    expect(ready.status).toBe(200);

    unblock?.();
    expect((await running).status).toBe(200);
  });

  test("client abort while queued settles quietly without entering the app or becoming a 500", async () => {
    let unblock: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    let calls = 0;

    const app = await appWithHandler(async () => {
      calls += 1;
      await blocked;
      return new Response("ok");
    }, { maxConcurrent: 1, maxQueue: 1 });

    const running = app.fetch(new Request(WORK_URL));
    await tick();

    const aborter = new AbortController();
    const abandoned = app.fetch(new Request(WORK_URL, { signal: aborter.signal }));
    await tick();
    aborter.abort(new Error("client disconnected"));

    const cancelled = await abandoned;
    expect(cancelled.status).toBe(499);
    expect(calls).toBe(1);

    unblock?.();
    expect((await running).status).toBe(200);
  });

  test("false leaves the existing request pipeline unbounded", async () => {
    let unblock: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    let active = 0;
    let maxActive = 0;

    const app = await appWithHandler(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await blocked;
      active -= 1;
      return new Response("ok");
    }, false);

    const first = app.fetch(new Request(WORK_URL));
    const second = app.fetch(new Request(WORK_URL));
    await tick();
    expect(maxActive).toBe(2);

    unblock?.();
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
  });
});
