import { expect, test } from "bun:test";
import { detectOptionsFromConfig } from "./config-detect";

test("detectOptionsFromConfig preserves backpressure options", () => {
  const backpressure = { maxConcurrent: 12, maxQueue: 6, retryAfterSeconds: 3 };
  const options = detectOptionsFromConfig("/tmp/x-app", {
    pagesDir: "src/pages",
    backpressure,
  });

  expect(options.backpressure).toEqual(backpressure);
});

test("detectOptionsFromConfig preserves explicit backpressure disable", () => {
  const options = detectOptionsFromConfig("/tmp/x-app", {
    pagesDir: "src/pages",
    backpressure: false,
  });

  expect(options.backpressure).toBe(false);
});
