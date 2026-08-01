import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The CLI is a thin orchestration layer, so it's tested end-to-end instead of
 * against internals (which aren't exported). This runs a real `x build` via
 * the actual entrypoint on a fixture project and asserts the `.x/` output
 * tree that the rest of the framework depends on.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/cli");
const CLI_ENTRY = join(import.meta.dir, "..", "src", "index.ts");

function touch(relPath: string, content: string) {
  const full = join(FIXTURE_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  const res = spawnSync(process.execPath, [CLI_ENTRY, ...args], {
    cwd: FIXTURE_DIR,
    encoding: "utf-8",
    timeout: 60_000,
  });
  return {
    status: res.status ?? -1,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

describe("x CLI (integration)", () => {
  beforeAll(() => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    touch(
      "x.config.ts",
      `export default {
  pagesDir: "src/pages",
  port: 3000,
};
`,
    );
    touch(
      "src/pages/index.tsx",
      `export const mode = "static";
export default function Home() {
  return <h1>CLI home</h1>;
}
`,
    );
    touch(
      "src/pages/about.tsx",
      `export default function About() {
  return <h1>CLI about</h1>;
}
`,
    );
    touch("public/styles.css", "body { color: blue; }\n");
  });

  afterAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  test("build emits the .x/client static tree + .x/server entry", () => {
    const res = runCli(["build", "--cwd", FIXTURE_DIR]);
    expect(res.status).toBe(0);
    expect(existsSync(join(FIXTURE_DIR, ".x/client/index.html"))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, ".x/server/index.ts"))).toBe(true);
  });

  test("build honors --outDir", () => {
    const res = runCli(["build", "--cwd", FIXTURE_DIR, "--outDir", "dist-custom"]);
    expect(res.status).toBe(0);
    expect(existsSync(join(FIXTURE_DIR, "dist-custom/client/index.html"))).toBe(true);
    expect(existsSync(join(FIXTURE_DIR, "dist-custom/server/index.ts"))).toBe(true);
  });

  test("unknown adapter fails with a clear error", () => {
    const res = runCli(["build", "--cwd", FIXTURE_DIR, "--adapter", "bogus"]);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('unknown adapter "bogus"');
  });

  test("--version prints a semver", () => {
    const res = runCli(["--version", "--cwd", FIXTURE_DIR]);
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("unknown command exits non-zero", () => {
    const res = runCli(["frobnicate", "--cwd", FIXTURE_DIR]);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('unknown command "frobnicate"');
  });
});
