import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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

  test("doctor exits 0 for a healthy project", () => {
    const healthy = join(FIXTURE_DIR, "healthy-doctor");
    mkdirSync(join(healthy, "src/pages"), { recursive: true });
    mkdirSync(join(healthy, "node_modules/@thexjs/core"), { recursive: true });
    mkdirSync(join(healthy, "node_modules/@thexjs/cli"), { recursive: true });
    writeFileSync(
      join(healthy, "package.json"),
      JSON.stringify({
        dependencies: { "@thexjs/core": "1.0.0" },
      }),
    );
    writeFileSync(join(healthy, "x.config.ts"), `export default { pagesDir: "src/pages" };\n`);
    writeFileSync(
      join(healthy, "src/pages/index.tsx"),
      "export default function Home() { return <h1>h</h1>; }\n",
    );
    writeFileSync(
      join(healthy, "node_modules/@thexjs/core/package.json"),
      JSON.stringify({ version: "1.0.0" }),
    );
    writeFileSync(
      join(healthy, "node_modules/@thexjs/cli/package.json"),
      JSON.stringify({ version: "1.0.0" }),
    );
    const res = runCli(["doctor", "--cwd", healthy]);
    expect(res.status).toBe(0);
    expect(res.stderr + res.stdout).toContain("no problems found");
    rmSync(healthy, { recursive: true, force: true });
  });

  test("doctor flags a project with no pages directory", () => {
    const empty = join(FIXTURE_DIR, "empty-doctor");
    mkdirSync(empty, { recursive: true });
    writeFileSync(join(empty, "package.json"), "{}");
    const res = runCli(["doctor", "--cwd", empty]);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toContain("node_modules/@thexjs is missing");
    rmSync(empty, { recursive: true, force: true });
  });

  test("doctor warns (non-fatally) about env access in island source", () => {
    const dirty = join(FIXTURE_DIR, "dirty-doctor");
    mkdirSync(join(dirty, "src/pages"), { recursive: true });
    mkdirSync(join(dirty, "node_modules/@thexjs/core"), { recursive: true });
    writeFileSync(
      join(dirty, "package.json"),
      JSON.stringify({
        dependencies: { "@thexjs/core": "1.0.0" },
      }),
    );
    writeFileSync(join(dirty, "x.config.ts"), 'export default { pagesDir: "src/pages" };\n');
    writeFileSync(
      join(dirty, "node_modules/@thexjs/core/package.json"),
      JSON.stringify({ version: "1.0.0" }),
    );
    writeFileSync(
      join(dirty, "src/pages/index.tsx"),
      `import type { ReactElement } from "react";

export default function Home() {
  const url = process.env.DATABASE_URL;
  return <h1>{url}</h1>;
}

export function Like(): ReactElement | null {
  return null;
}

export const islands = { Like: Like };
`,
    );
    const res = runCli(["doctor", "--cwd", dirty]);
    expect(res.status).toBe(0);
    expect(res.stderr + res.stdout).toContain("DATABASE_URL");
    expect(res.stderr + res.stdout).toContain("referenced in island source");
    rmSync(dirty, { recursive: true, force: true });
  });

  test("dev server stays responsive while the Tailwind watcher recompiles (#137)", async () => {
    // A dev project whose `bunx` is a fake that sleeps — a stand-in for a real
    // (slow) `bunx tailwindcss` compile. The watcher recompile must run via
    // async `spawn`, so the single-threaded server keeps serving while it runs.
    const dev = join(FIXTURE_DIR, "dev-tw");
    mkdirSync(join(dev, "src/pages"), { recursive: true });
    mkdirSync(join(dev, "src/styles"), { recursive: true });
    mkdirSync(join(dev, "public"), { recursive: true });
    mkdirSync(join(dev, "fake-bin"), { recursive: true });
    writeFileSync(
      join(dev, "x.config.ts"),
      'export default { pagesDir: "src/pages", port: 4310 };\n',
    );
    writeFileSync(
      join(dev, "src/pages/index.tsx"),
      'export const mode = "static";\n' +
        "export default function Home() {\n" +
        "  return <h1>dev home</h1>;\n" +
        "}\n",
    );
    writeFileSync(join(dev, "src/styles/globals.css"), "body { color: red; }\n");
    writeFileSync(join(dev, "public/styles.css"), "");
    const fakeBunx = join(dev, "fake-bin", "bunx");
    // A real Tailwind compile is slow (hundreds of ms to seconds); a fake
    // that sleeps 3s (writing a marker so the test can observe the compile is
    // in flight) is a deterministic stand-in. A synchronous watcher compile
    // would hold the single-threaded dev server for the full duration.
    writeFileSync(fakeBunx, "#!/bin/sh\n: > compiling.marker\nsleep 3\nrm -f compiling.marker\n");
    chmodSync(fakeBunx, 0o755);
    const env = {
      ...process.env,
      PATH: `${join(dev, "fake-bin")}:${process.env.PATH ?? ""}`,
    };

    const proc = spawn(process.execPath, [CLI_ENTRY, "dev", "--cwd", dev], {
      cwd: dev,
      env,
      stdio: ["ignore", "ignore", "ignore"],
    });

    const url = "http://localhost:4310/";
    const marker = () => existsSync(join(dev, "compiling.marker"));
    try {
      // Wait for the server to come up (the pre-boot spawnSync compile sleeps
      // 3s via the fake bunx, so poll a while).
      let up = false;
      for (let i = 0; i < 100 && !up; i++) {
        try {
          const res = await fetch(url);
          up = res.status === 200;
        } catch {}
        if (!up) await new Promise((r) => setTimeout(r, 100));
      }
      expect(up).toBe(true);

      // Trigger a watcher recompile: touch the CSS. Then wait until the fake
      // compile has definitely started (marker present) before fetching, so
      // the request provably overlaps an in-flight recompile.
      appendFileSync(join(dev, "src/styles/globals.css"), "body { color: blue; }\n");
      let compiling = false;
      for (let i = 0; i < 100 && !compiling; i++) {
        compiling = marker();
        if (!compiling) await new Promise((r) => setTimeout(r, 50));
      }
      expect(compiling).toBe(true);

      const t0 = Date.now();
      const res = await fetch(url);
      const elapsed = Date.now() - t0;
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("dev home");
      // The server responded while the compile (≥3s sleep) was still running.
      // A synchronous watcher would have blocked for the compile's remaining
      // ~2.5s, making this request take seconds instead of milliseconds.
      expect(elapsed).toBeLessThan(1000);
      // The compile eventually finished.
      for (let i = 0; i < 100 && marker(); i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(marker()).toBe(false);
    } finally {
      proc.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 300));
      try {
        proc.kill("SIGKILL");
      } catch {}
      rmSync(dev, { recursive: true, force: true });
    }
  }, 30_000);

  test("dev server exits promptly on SIGTERM instead of waiting the 3s grace period (#139)", async () => {
    const dev = join(FIXTURE_DIR, "dev-shutdown");
    mkdirSync(join(dev, "src/pages"), { recursive: true });
    writeFileSync(
      join(dev, "x.config.ts"),
      'export default { pagesDir: "src/pages", port: 4311 };\n',
    );
    writeFileSync(
      join(dev, "src/pages/index.tsx"),
      "export default function Home() {\n" + "  return <h1>bye</h1>;\n" + "}\n",
    );

    const proc = spawn(process.execPath, [CLI_ENTRY, "dev", "--cwd", dev], {
      cwd: dev,
      env: process.env,
      stdio: ["ignore", "ignore", "ignore"],
    });

    const url = "http://localhost:4311/";
    try {
      let up = false;
      for (let i = 0; i < 100 && !up; i++) {
        try {
          const res = await fetch(url);
          up = res.status === 200;
        } catch {}
        if (!up) await new Promise((r) => setTimeout(r, 100));
      }
      expect(up).toBe(true);

      // SIGTERM → the process should tear down as soon as stop(true) resolves,
      // far quicker than the 3s hard-cap fallback timer.
      const t0 = Date.now();
      proc.kill("SIGTERM");
      const code = await new Promise<number | null>((resolve) => {
        proc.on("exit", (c) => resolve(c));
        setTimeout(() => resolve(null), 10_000);
      });
      const elapsed = Date.now() - t0;
      expect(code).toBe(0);
      expect(elapsed).toBeLessThan(2000);
    } finally {
      try {
        proc.kill("SIGKILL");
      } catch {}
      rmSync(dev, { recursive: true, force: true });
    }
  });

  test("x start shows a friendly error when bun is not on PATH (#180)", async () => {
    const noBun = join(FIXTURE_DIR, "no-bun-start");
    mkdirSync(join(noBun, ".x", "server"), { recursive: true });
    writeFileSync(
      join(noBun, "x.config.ts"),
      'export default { pagesDir: "src/pages", port: 4320 };\n',
    );
    // Minimal server entry so cmdStart doesn't bail with "no built server"
    writeFileSync(
      join(noBun, ".x", "server", "index.ts"),
      "Bun.serve({ port: 4320, fetch: () => new Response('ok') });\n",
    );

    const res = spawnSync(process.execPath, [CLI_ENTRY, "start", "--cwd", noBun], {
      cwd: noBun,
      encoding: "utf-8",
      timeout: 10_000,
      env: {
        ...process.env,
        // Strip bun from PATH so spawn("bun", ...) hits the error handler
        PATH: "/usr/bin:/bin",
      },
    });
    const output = res.stdout + res.stderr;
    expect(res.status).not.toBe(0);
    expect(output).toContain("ensure bun is installed");
    expect(output).toContain("bun.sh");
    rmSync(noBun, { recursive: true, force: true });
  });
});
