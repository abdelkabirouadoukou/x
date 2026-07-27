#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

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

async function detectOptions(): Promise<{
  routesDir: string;
  contentDir: string | undefined;
  port: number;
}> {
  const configPath = findConfig();
  if (configPath) {
    try {
      const mod = (await import(configPath)) as {
        default?: { routesDir?: string; contentDir?: string; port?: number };
      };
      const cfg = mod.default ?? {};
      const contentDir =
        cfg.contentDir !== undefined
          ? cfg.contentDir
          : existsSync(join(projectDir, "content"))
            ? join(projectDir, "content")
            : undefined;
      return {
        routesDir: cfg.routesDir ?? join(projectDir, "src", "routes"),
        contentDir,
        port: cfg.port ?? 3000,
      };
    } catch (err) {
      console.warn(`[x] failed to load config: ${err}`);
    }
  }

  return {
    routesDir: join(projectDir, "src", "routes"),
    contentDir: existsSync(join(projectDir, "content")) ? join(projectDir, "content") : undefined,
    port: 3000,
  };
}

async function cmdDev(): Promise<void> {
  const serverPath = join(projectDir, "server.ts");
  if (!existsSync(serverPath)) {
    const opts = await detectOptions();
    const genOpts: { routesDir: string; contentDir?: string; port: number } = {
      routesDir: opts.routesDir,
      port: opts.port,
    };
    if (opts.contentDir) genOpts.contentDir = opts.contentDir;
    generateServerFile(serverPath, genOpts);
    console.log("[x] generated default server.ts");
  }

  console.log("[x] dev server starting...");
  const proc = spawn("bun", ["--hot", serverPath], {
    stdio: "inherit",
    cwd: projectDir,
    env: { ...process.env, NODE_ENV: "development" },
  });

  proc.on("exit", (code) => process.exit(code ?? 1));
}

async function cmdBuild(): Promise<void> {
  const opts = await detectOptions();

  console.log("[x] build starting...");
  const start = performance.now();

  const { build } = await import("@x/core");
  const outDir = join(projectDir, ".x");

  const buildOpts: { routesDir: string; contentDir?: string; outDir: string } = {
    routesDir: opts.routesDir,
    outDir,
  };
  if (opts.contentDir) buildOpts.contentDir = opts.contentDir;

  await build(buildOpts);

  const ms = Math.round(performance.now() - start);
  console.log(`[x] build complete in ${ms}ms -> ${relative(projectDir, outDir)}`);
}

async function cmdStart(): Promise<void> {
  const outDir = join(projectDir, ".x");
  const serverBundle = join(outDir, "server", "index.js");

  if (!existsSync(serverBundle)) {
    console.error(`[x] no built server found at ${serverBundle}`);
    console.error(`[x] run "x build" first`);
    process.exit(1);
  }

  console.log("[x] starting production server...");
  const proc = spawn("bun", [serverBundle], {
    stdio: "inherit",
    cwd: projectDir,
    env: { ...process.env, NODE_ENV: "production" },
  });

  proc.on("exit", (code) => process.exit(code ?? 1));
}

function generateServerFile(
  serverPath: string,
  opts: { routesDir: string; contentDir?: string; port: number },
): void {
  const content: string[] = [
    `import { createApp } from "@x/core";`,
    "",
    "const app = await createApp({",
    `  routesDir: ${JSON.stringify(opts.routesDir)}.replace(process.cwd() + "/", "").replace(process.cwd(), "."),`,
    `  port: ${opts.port},`,
    "  development: true,",
    "});",
    "",
    "const server = Bun.serve(app);",
    "",
    "console.log(`[x] dev server running at ${server.url}`);",
  ];

  if (opts.contentDir) {
    content.splice(
      4,
      0,
      `  contentDir: ${JSON.stringify(opts.contentDir)}.replace(process.cwd() + "/", "").replace(process.cwd(), "."),`,
    );
  }

  writeFileSync(serverPath, content.join("\n"), "utf-8");
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
