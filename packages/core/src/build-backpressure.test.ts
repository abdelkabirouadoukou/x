import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "./build";

test("build-generated production entry forwards backpressure from x.config", async () => {
  const root = mkdtempSync(join(tmpdir(), "x-build-backpressure-"));
  const pagesDir = join(root, "src", "pages");
  const outDir = join(root, ".x");
  const configPath = join(root, "x.config.ts");
  mkdirSync(pagesDir, { recursive: true });
  writeFileSync(
    configPath,
    `export default { backpressure: { maxConcurrent: 8, maxQueue: 4 } };\n`,
  );

  try {
    await build({ pagesDir, outDir, configPath });
    const entry = readFileSync(join(outDir, "server", "index.ts"), "utf-8");
    expect(entry).toContain(
      "...(userConfig.backpressure !== undefined ? { backpressure: userConfig.backpressure } : {}),",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
