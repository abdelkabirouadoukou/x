#!/usr/bin/env bun
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// Strip leading "run" so `x run dev` / `x run build` / `x run start` all work
// (common muscle memory from `npm run` / `bun run`).
function parseArgv(argv: string[]): { command: string | undefined; cwd: string | undefined } {
  const rest: string[] = [];
  let cwd: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "--cwd") {
      cwd = argv[++i];
      continue;
    }
    if (arg.startsWith("--cwd=")) {
      cwd = arg.slice("--cwd=".length);
      continue;
    }
    rest.push(arg);
  }

  if (rest[0] === "run") rest.shift();

  return { command: rest[0], cwd };
}

const { command, cwd } = parseArgv(Bun.argv.slice(2));
const projectDir = cwd ? resolve(process.cwd(), cwd) : process.cwd();

function findConfig(): string | null {
  const candidates = ["x.config.ts", "x.config.js", "x.config.mjs"];
  for (const name of candidates) {
    const full = join(projectDir, name);
    if (existsSync(full)) return full;
  }
  return null;
}

interface DetectedOptions {
  routesDir?: string;
  pagesDir?: string;
  apiDir?: string;
  layoutsDir?: string;
  actionsDir?: string;
  contentDir?: string;
  port: number;
}

function dropUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function detectOptionsFromConfig(cfg: Record<string, unknown>): DetectedOptions {
  const resolveDir = (dir: unknown) =>
    typeof dir === "string" ? join(projectDir, dir) : undefined;
  const guessPages = join(projectDir, "src", "pages");
  const guessRoutes = join(projectDir, "src", "routes");
  const defaultPagesDir =
    typeof cfg.pagesDir === "string"
      ? resolveDir(cfg.pagesDir)
      : typeof cfg.routesDir === "string"
        ? resolveDir(cfg.routesDir)
        : existsSync(guessPages)
          ? guessPages
          : guessRoutes;
  const contentDir =
    typeof cfg.contentDir === "string"
      ? resolveDir(cfg.contentDir)
      : existsSync(join(projectDir, "content"))
        ? join(projectDir, "content")
        : undefined;
  return dropUndefined({
    routesDir: resolveDir(cfg.routesDir) || undefined,
    pagesDir: defaultPagesDir,
    apiDir: resolveDir(cfg.apiDir) || undefined,
    layoutsDir: resolveDir(cfg.layoutsDir) || undefined,
    actionsDir: resolveDir(cfg.actionsDir) || undefined,
    contentDir,
    port: (cfg.port as number) ?? 3000,
  }) as unknown as DetectedOptions;
}

function detectDefaultOptions(): DetectedOptions {
  const guessPages = join(projectDir, "src", "pages");
  const guessRoutes = join(projectDir, "src", "routes");
  const pagesDir = existsSync(guessPages) ? guessPages : guessRoutes;
  const contentDir = existsSync(join(projectDir, "content"))
    ? join(projectDir, "content")
    : undefined;
  return dropUndefined({
    pagesDir,
    contentDir,
    port: 3000,
  }) as unknown as DetectedOptions;
}

async function detectOptions(): Promise<DetectedOptions> {
  const configPath = findConfig();
  if (configPath) {
    try {
      const mod = (await import(configPath)) as { default?: Record<string, unknown> };
      return detectOptionsFromConfig(mod.default ?? {});
    } catch (err) {
      console.warn(`[x] failed to load config: ${err}`);
    }
  }

  return detectDefaultOptions();
}

async function cmdDev(): Promise<void> {
  const opts = await detectOptions();
  const { createApp } = await import("@thexjs/core");
  const { port: _port, ...dirs } = opts;

  // Auto-compile Tailwind if a source entry exists
  const twInput = join(projectDir, "src/styles/globals.css");
  const twOutput = join(projectDir, "public/styles.css");
  if (existsSync(twInput)) {
    console.log("[x] compiling Tailwind CSS...");
    const { writeFileSync } = await import("node:fs");
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync("bunx", ["tailwindcss", "-i", twInput, "-o", twOutput], {
      cwd: projectDir,
    });
    if (r.status !== 0) console.warn("[x] Tailwind compilation failed, serving raw CSS.");
  }

  // Watch for CSS changes and recompile Tailwind
  const twSrc = join(projectDir, "src/styles");
  if (existsSync(twSrc)) {
    const { watch } = await import("node:fs");
    let twTimeout: ReturnType<typeof setTimeout> | null = null;
    watch(twSrc, { recursive: true }, () => {
      if (twTimeout) clearTimeout(twTimeout);
      twTimeout = setTimeout(() => {
        console.log("[x] recompiling Tailwind CSS...");
        spawnSync("bunx", ["tailwindcss", "-i", twInput, "-o", twOutput], { cwd: projectDir });
      }, 200);
    });
  }

  console.log("[x] dev server starting...");
  const app = await createApp({ ...dirs, development: true });
  let port = opts.port;
  let server;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      server = Bun.serve({ ...app, port });
      break;
    } catch (e) {
      if ((e as { code?: string })?.code === "EADDRINUSE") {
        port++;
        continue;
      }
      throw e;
    }
  }
  if (!server) {
    console.error("[x] could not find an available port after 20 attempts");
    process.exit(1);
  }
  console.log(`[x] dev server running at http://localhost:${port}`);
}

async function cmdBuild(): Promise<void> {
  const opts = await detectOptions();

  console.log("[x] build starting...");
  const start = performance.now();

  // Compile Tailwind for production
  const twInput = join(projectDir, "src/styles/globals.css");
  const twOutput = join(projectDir, "public/styles.css");
  if (existsSync(twInput)) {
    console.log("[x] compiling Tailwind CSS (production)...");
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync("bunx", ["tailwindcss", "-i", twInput, "-o", twOutput, "--minify"], {
      cwd: projectDir,
    });
    if (r.status !== 0) console.warn("[x] Tailwind compilation failed.");
  }

  const { build } = await import("@thexjs/core");
  const outDir = join(projectDir, ".x");
  const { port: _port, ...rest } = opts;
  await build({ ...rest, outDir });

  const ms = Math.round(performance.now() - start);
  console.log(`[x] build complete in ${ms}ms -> ${relative(projectDir, outDir)}`);
}

async function cmdStart(): Promise<void> {
  const outDir = join(projectDir, ".x");
  const serverEntry = join(outDir, "server", "index.ts");

  if (!existsSync(serverEntry)) {
    console.error(`[x] no built server found at ${serverEntry}`);
    console.error(`[x] run "x build" first`);
    process.exit(1);
  }

  console.log("[x] starting production server...");
  const proc = spawn("bun", [serverEntry], {
    stdio: "inherit",
    cwd: projectDir,
    env: { ...process.env, NODE_ENV: "production" },
  });

  proc.on("exit", (code) => process.exit(code ?? 1));
}

function printVersion(): void {
  try {
    const pkgPath = join(import.meta.dir, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    console.log(pkg.version ?? "0.0.1");
  } catch {
    console.log("0.0.1");
  }
}

function printHelp(): void {
  console.log(`x — full-stack React framework on Bun

Usage:
  x <command> [options]

Commands:
  dev     Start the development server with hot reload
  build   Build for production (static export + server bundle -> .x/)
  start   Start the production server (run "x build" first)

Options:
  --cwd <dir>    Run as if started inside <dir> (default: current directory)
  -h, --help     Show this help message
  -v, --version  Print the CLI version

Tip: "x run dev" also works, as an alias for "x dev".`);
}

async function main(): Promise<void> {
  if (command === "--version" || command === "-v") {
    printVersion();
    return;
  }

  switch (command) {
    case "dev":
      await cmdDev();
      break;
    case "build":
      await cmdBuild();
      break;
    case "start":
      await cmdStart();
      break;
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      if (command === undefined) process.exitCode = 1;
      break;
    default:
      console.error(`[x] unknown command "${command}"`);
      printHelp();
      process.exit(1);
  }
}

await main();
