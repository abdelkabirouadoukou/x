import { describe, expect, test } from "bun:test";
import {
  BackpressureSaturatedError,
  createBackpressureController,
  withBackpressure,
} from "./backpressure";

describe("backpressure controller", () => {
  test("admits up to maxConcurrent and tracks active work", async () => {
    const controller = createBackpressureController({ maxConcurrent: 2, maxQueue: 0 });
    const first = await controller.acquire();
    const second = await controller.acquire();

    expect(controller.snapshot()).toEqual({
      active: 2,
      queued: 0,
      maxConcurrent: 2,
      maxQueue: 0,
    });

    first.release();
    second.release();
    expect(controller.snapshot().active).toBe(0);
  });

  test("promotes queued requests in FIFO order", async () => {
    const controller = createBackpressureController({ maxConcurrent: 1, maxQueue: 2 });
    const active = await controller.acquire();
    const order: string[] = [];
    const secondPromise = controller.acquire().then((lease) => {
      order.push("second");
      return lease;
    });
    const thirdPromise = controller.acquire().then((lease) => {
      order.push("third");
      return lease;
    });

    expect(controller.snapshot().queued).toBe(2);
    active.release();

    const second = await secondPromise;
    expect(order).toEqual(["second"]);
    second.release();

    const third = await thirdPromise;
    expect(order).toEqual(["second", "third"]);
    third.release();
  });

  test("rejects immediately when active and queue capacity are exhausted", async () => {
    const controller = createBackpressureController({
      maxConcurrent: 1,
      maxQueue: 1,
      retryAfterSeconds: 7,
    });
    const active = await controller.acquire();
    const queued = controller.acquire();

    try {
      await controller.acquire();
      throw new Error("expected saturation");
    } catch (error) {
      expect(error).toBeInstanceOf(BackpressureSaturatedError);
      expect((error as BackpressureSaturatedError).retryAfterSeconds).toBe(7);
    }

    active.release();
    (await queued).release();
  });

  test("aborted queued requests are removed without consuming the next slot", async () => {
    const controller = createBackpressureController({ maxConcurrent: 1, maxQueue: 2 });
    const active = await controller.acquire();
    const aborter = new AbortController();
    const abandoned = controller.acquire(aborter.signal);
    const survivor = controller.acquire();

    expect(controller.snapshot().queued).toBe(2);
    aborter.abort(new Error("client disconnected"));

    try {
      await abandoned;
      throw new Error("expected abort");
    } catch (error) {
      expect(String(error)).toContain("client disconnected");
    }
    expect(controller.snapshot().queued).toBe(1);

    active.release();
    const next = await survivor;
    expect(controller.snapshot()).toEqual({
      active: 1,
      queued: 0,
      maxConcurrent: 1,
      maxQueue: 2,
    });
    next.release();
  });

  test("release is idempotent", async () => {
    const controller = createBackpressureController({ maxConcurrent: 1 });
    const lease = await controller.acquire();
    lease.release();
    lease.release();
    expect(controller.snapshot().active).toBe(0);
  });

  test("rejects invalid capacity configuration", () => {
    expect(() => createBackpressureController({ maxConcurrent: 0 })).toThrow();
    expect(() => createBackpressureController({ maxConcurrent: 1, maxQueue: -1 })).toThrow();
    expect(() =>
      createBackpressureController({ maxConcurrent: 1, retryAfterSeconds: 0 }),
    ).toThrow();
  });
});

describe("withBackpressure", () => {
  test("returns 503 with Retry-After when the process is saturated", async () => {
    let unblock: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const handler = withBackpressure(
      async () => {
        await blocked;
        return new Response("ok");
      },
      { maxConcurrent: 1, maxQueue: 0, retryAfterSeconds: 4 },
    );

    const running = handler(new Request("http://localhost/slow"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const saturated = await handler(new Request("http://localhost/slow"));

    expect(saturated.status).toBe(503);
    expect(saturated.headers.get("Retry-After")).toBe("4");
    expect(saturated.headers.get("Content-Type")).toContain("text/plain");

    unblock?.();
    expect((await running).status).toBe(200);
  });

  test("does not invoke the handler for a request aborted while queued", async () => {
    let unblock: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    let calls = 0;
    const handler = withBackpressure(
      async () => {
        calls += 1;
        await blocked;
        return new Response("ok");
      },
      { maxConcurrent: 1, maxQueue: 1 },
    );

    const running = handler(new Request("http://localhost/slow"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const aborter = new AbortController();
    const abandoned = handler(new Request("http://localhost/slow", { signal: aborter.signal }));
    aborter.abort(new Error("client disconnected"));

    try {
      await abandoned;
      throw new Error("expected abort");
    } catch (error) {
      expect(String(error)).toContain("client disconnected");
    }
    expect(calls).toBe(1);

    unblock?.();
    expect((await running).status).toBe(200);
  });
});
