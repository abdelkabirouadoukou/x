import { afterAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileTailwindAsync } from "./tailwind";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__");

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("compileTailwindAsync serialization (#8)", () => {
  test("coalesces rapid saves and never runs two compiles at once", async () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    const dir = mkdtempSync(join(FIXTURE_DIR, "tw-serialize-"));
    const bin = join(dir, "bin");
    const log = join(dir, "runs.log");
    const twInput = join(dir, "globals.css");
    const twOutput = join(dir, "styles.css");
    mkdirSync(bin, { recursive: true });
    writeFileSync(twInput, "body { color: red; }");
    writeFileSync(
      join(bin, "bunx"),
      `#!/bin/sh\nprintf 'start %s\\n' "$(perl -MTime::HiRes=time -e 'print time')" >> "${log}"\nsleep 0.2\nprintf 'end %s\\n' "$(perl -MTime::HiRes=time -e 'print time')" >> "${log}"\n`,
    );
    chmodSync(join(bin, "bunx"), 0o755);

    const previousPath = process.env.PATH;
    process.env.PATH = `${bin}:${previousPath ?? ""}`;
    try {
      const first = compileTailwindAsync(twInput, twOutput, dir);
      // A second save lands mid-compile: it must coalesce into a follow-up run
      // instead of forking a second process that races the first on the same
      // output file. Serialization is asserted synchronously by identity — the
      // second call must return the exact same in-flight process rather than
      // spawning a new one immediately.
      const second = compileTailwindAsync(twInput, twOutput, dir);
      expect(second).toBe(first);

      // The pending save triggers exactly one more run after the first exits,
      // and the two runs must not overlap (the second starts only after the
      // first has fully closed).
      await pollLog(log, 2, 2);
      const lines = readLog(log);
      expect(lines.filter((l) => l.startsWith("start"))).toHaveLength(2);
      expect(lines.filter((l) => l.startsWith("end"))).toHaveLength(2);
      const starts = numbers(lines.filter((l) => l.startsWith("start")));
      const ends = numbers(lines.filter((l) => l.startsWith("end")));
      expect(ends[0]).toBeLessThanOrEqual(starts[1] ?? 0);

      // With the queue drained, a fresh save starts a brand-new compile. Wait
      // for its marker to appear (printed asynchronously after the previous
      // process closes) rather than asserting immediately.
      const third = compileTailwindAsync(twInput, twOutput, dir);
      expect(third).not.toBe(first);
      await pollLog(log, 3, 3);
      const finalLines = readLog(log);
      expect(finalLines.filter((l) => l.startsWith("start"))).toHaveLength(3);
      expect(finalLines.filter((l) => l.startsWith("end"))).toHaveLength(3);
    } finally {
      process.env.PATH = previousPath ?? "";
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function pollLog(path: string, starts: number, ends: number): Promise<void> {
  const deadline = Date.now() + 5000;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const lines = readLog(path);
      if (
        lines.filter((l) => l.startsWith("start")).length >= starts &&
        lines.filter((l) => l.startsWith("end")).length >= ends
      ) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error(`timed out waiting for ${starts} starts / ${ends} ends in ${path}`));
        return;
      }
      setTimeout(tick, 25);
    };
    tick();
  });
}

function readLog(path: string): string[] {
  // The log file is created by the (asynchronously spawned) compile process,
  // so it may not exist yet when the first poll runs. Treat a missing file as
  // an empty log and let the caller poll until it appears.
  try {
    return readFileSync(path, "utf8").split("\n").filter(Boolean);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

function numbers(lines: string[]): number[] {
  return lines.map((l) => Number(l.split(" ")[1]));
}
