import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { installProcessCrashHandlers } from "./crash-handlers";
import { setErrorReporter } from "./monitoring";

let captured: { error: unknown; context: unknown }[] = [];
let originalExit: typeof process.exit;

beforeAll(() => {
  setErrorReporter({
    captureException(error, context) {
      captured.push({ error, context });
    },
  });
  originalExit = process.exit;
});

afterAll(() => {
  setErrorReporter({ captureException: () => {} });
  process.exit = originalExit;
});

function stubExit(): () => number {
  let calls = 0;
  process.exit = (() => {
    calls++;
    return 0 as never;
  }) as typeof process.exit;
  return () => calls;
}

describe("installProcessCrashHandlers", () => {
  test("reports uncaughtException through the error reporter", () => {
    captured = [];
    const dispose = installProcessCrashHandlers({ exitOnCrash: false });
    try {
      process.emit("uncaughtException", new Error("boom outside request"));
      expect(captured).toHaveLength(1);
      expect(captured[0]).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({ message: "boom outside request" }),
          context: expect.objectContaining({ phase: "api" }),
        }),
      );
    } finally {
      dispose();
    }
  });

  test("reports unhandledRejection, including non-Error reasons", () => {
    captured = [];
    const dispose = installProcessCrashHandlers();
    try {
      process.emit("unhandledRejection", "string rejection reason");
      expect(captured).toHaveLength(1);
      expect(captured[0]?.error).toBe("string rejection reason");
    } finally {
      dispose();
    }
  });

  test("cleanup removes the listeners", () => {
    const beforeUncaught = process.listenerCount("uncaughtException");
    const beforeUnhandled = process.listenerCount("unhandledRejection");

    const dispose = installProcessCrashHandlers();
    expect(process.listenerCount("uncaughtException")).toBe(beforeUncaught + 1);
    expect(process.listenerCount("unhandledRejection")).toBe(beforeUnhandled + 1);

    dispose();
    expect(process.listenerCount("uncaughtException")).toBe(beforeUncaught);
    expect(process.listenerCount("unhandledRejection")).toBe(beforeUnhandled);
  });

  test("defaults to exiting on an uncaught exception (fail fast)", () => {
    const exitCalls = stubExit();
    const dispose = installProcessCrashHandlers(); // no options -> exitOnCrash true
    try {
      process.emit("uncaughtException", new Error("boom"));
      expect(exitCalls()).toBe(1);
    } finally {
      dispose();
      process.exit = originalExit;
    }
  });

  test("exitOnCrash: false keeps serving after uncaught exception", () => {
    const exitCalls = stubExit();
    const dispose = installProcessCrashHandlers({ exitOnCrash: false });
    try {
      process.emit("uncaughtException", new Error("boom"));
      expect(exitCalls()).toBe(0);
    } finally {
      dispose();
      process.exit = originalExit;
    }
  });

  test("does not exit on unhandled rejection by default (survivable)", () => {
    const exitCalls = stubExit();
    const dispose = installProcessCrashHandlers();
    try {
      process.emit("unhandledRejection", "recovered");
      expect(exitCalls()).toBe(0);
    } finally {
      dispose();
      process.exit = originalExit;
    }
  });

  test("exitOnUnhandledRejection: true exits on rejection", () => {
    const exitCalls = stubExit();
    const dispose = installProcessCrashHandlers({ exitOnUnhandledRejection: true });
    try {
      process.emit("unhandledRejection", "fatal");
      expect(exitCalls()).toBe(1);
    } finally {
      dispose();
      process.exit = originalExit;
    }
  });
});
