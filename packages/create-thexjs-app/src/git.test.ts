import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initGitRepo } from "./git";

describe("initGitRepo", () => {
  let fixtureRoot: string;

  beforeAll(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "x-git-init-"));
  });

  afterAll(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  function scenario(script: string): { binDir: string; targetDir: string } {
    const binDir = join(fixtureRoot, randomUUID());
    mkdirSync(binDir);
    const git = join(binDir, "git");
    writeFileSync(git, `#!/bin/sh\n${script}\n`);
    chmodSync(git, 0o755);
    const targetDir = join(fixtureRoot, randomUUID());
    mkdirSync(targetDir);
    return { binDir, targetDir };
  }

  const envWith = (binDir: string) => ({
    PATH: binDir,
    HOME: process.env.HOME ?? "",
  });

  test("reports ok with the success message when git init succeeds", () => {
    const { binDir, targetDir } = scenario("exit 0");
    const result = initGitRepo(targetDir, envWith(binDir));
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Git repository initialized on main");
  });

  test("surfaces the first line of stderr when git init fails", () => {
    const { binDir, targetDir } = scenario(
      'echo "fatal: not in a directory named foo" >&2\necho "second line that must not leak" >&2\nexit 128',
    );
    const result = initGitRepo(targetDir, envWith(binDir));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("fatal: not in a directory named foo");
    expect(result.message).not.toContain("second line");
  });

  test("falls back to a generic message when stderr is empty", () => {
    const { binDir, targetDir } = scenario("exit 1");
    const result = initGitRepo(targetDir, envWith(binDir));
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Git could not be initialized (is git installed?)");
  });

  test("falls back to a generic message when git is missing entirely", () => {
    const emptyBin = join(fixtureRoot, randomUUID());
    mkdirSync(emptyBin);
    const targetDir = join(fixtureRoot, randomUUID());
    mkdirSync(targetDir);
    const result = initGitRepo(targetDir, envWith(emptyBin));
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Git could not be initialized (is git installed?)");
  });

  test("actually creates a .git dir on the happy path", () => {
    if (spawnSync("git", ["--version"], { stdio: "ignore" }).status !== 0) return;
    const targetDir = join(fixtureRoot, randomUUID());
    mkdirSync(targetDir);
    const result = initGitRepo(targetDir);
    expect(result.ok).toBe(true);
    expect(existsSync(join(targetDir, ".git", "HEAD"))).toBe(true);
  });
});
