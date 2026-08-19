import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { installProcessCrashHandlers } from "./crash-handlers";
import { setErrorReporter } from "./monitoring";

let captured: { error: unknown; context: unknown }[] = [];

beforeAll(() => {
  setErrorReporter({
    captureException(error, context) {
      captured.push({ error, context });
    },
  });
});

afterAll(() => {
  setErrorReporter({ captureException: () => {} });
});

describe("installProcessCrashHandlers", () => {
  test("reports uncaughtException through the error reporter", () => {
    captured = [];
    const dispose = installProcessCrashHandlers();
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
});
