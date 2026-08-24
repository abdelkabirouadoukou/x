import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyAddon, type FeatureId, normalizeFeatures } from "./templates";

describe("normalizeFeatures", () => {
  test("shadcn alone keeps shadcn AND auto-enables tailwind", () => {
    // Regression: the old tailwind auto-enable built
    // ["tailwind", ...features.filter((f) => f !== "shadcn")], silently
    // dropping shadcn itself — no deps, no addon files, misleading warn.
    const { features, autoEnabled } = normalizeFeatures(["shadcn"]);
    expect(features).toEqual(["tailwind", "shadcn"]);
    expect(autoEnabled).toEqual([{ added: "tailwind", because: "shadcn" }]);
  });

  test("explicit tailwind + shadcn needs no auto-enable", () => {
    const { features, autoEnabled } = normalizeFeatures(["tailwind", "shadcn"]);
    expect(features).toEqual(["tailwind", "shadcn"]);
    expect(autoEnabled).toEqual([]);
  });

  test("selections without requirements pass through unchanged", () => {
    const { features, autoEnabled } = normalizeFeatures(["auth", "hooks"]);
    expect(features).toEqual(["auth", "hooks"]);
    expect(autoEnabled).toEqual([]);
  });

  test("dedupes repeated selections", () => {
    const { features, autoEnabled } = normalizeFeatures([
      "tailwind",
      "tailwind",
      "shadcn",
      "shadcn",
    ] as FeatureId[]);
    expect(features).toEqual(["tailwind", "shadcn"]);
    expect(autoEnabled).toEqual([]);
  });

  test("orders output by catalog order regardless of input order", () => {
    const { features } = normalizeFeatures(["hooks", "content", "auth", "tailwind", "shadcn"]);
    expect(features).toEqual(["tailwind", "shadcn", "auth", "content", "hooks"]);
  });

  test("empty selection stays empty", () => {
    const { features, autoEnabled } = normalizeFeatures([]);
    expect(features).toEqual([]);
    expect(autoEnabled).toEqual([]);
  });
});

describe("copyAddon (shadcn)", () => {
  let targetDir: string;

  beforeAll(() => {
    targetDir = mkdtempSync(join(tmpdir(), "x-shadcn-addon-"));
  });

  afterAll(() => {
    rmSync(targetDir, { recursive: true, force: true });
  });

  test("copies the shadcn addon files into the target dir", () => {
    copyAddon("shadcn", targetDir);
    // The shadcn addon ships src/lib/utils.ts; assert it landed.
    expect(existsSync(join(targetDir, "src", "lib", "utils.ts"))).toBe(true);
  });
});
