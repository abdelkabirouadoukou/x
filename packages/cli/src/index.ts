#!/usr/bin/env bun
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import {
  type DetectedOptions,
  detectDefaultOptions,
  detectOptionsFromConfig,
  findConfig,
} from "./config-detect.js";
import { runDoctor } from "./doctor.js";
import { compileTailwindAsync } from "./tailwind.js";
import { xError, xInfo, xSuccess, xWarn } from "./terminal.js";

// Strip leading "run" so `x run dev` / `x run build` / `x run start` all work
// (common muscle memory from `npm run` / `bun run`).
function parseArgv(argv: string[]): {
  command: string | undefined;
  cwd: string | undefined;
  adapter: string | undefined;
  outDir: string | undefined;
} {
  const rest: string[] = [];
  let cwd: string | undefined;
  let adapter: string | undefined;
  let outDir: string | undefined;

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
    if (arg === "--adapter") {
      const next = argv[++i];
      if (!next || next.startsWith("--")) {
        xError('"--adapter" requires a name, e.g. "--adapter vercel"');
        process.exit(1);
      }
      adapter = next;
      continue;
    }
    if (arg.startsWith("--adapter=")) {
      const value = arg.slice("--adapter=".length);
      if (!value) {
        xError('"--adapter=" requires a name, e.g. "--adapter=vercel"');
        process.exit(1);
      }
      adapter = value;
      continue;
    }
    if (arg === "--outDir") {
      const next = argv[++i];
      if (!next || next.startsWith("--")) {
        xError('"--outDir" requires a path, e.g. "--outDir dist"');
        process.exit(1);
      }
      outDir = next;
      continue;
    }
    if (arg.startsWith("--outDir=")) {
      const value = arg.slice("--outDir=".length);
      if (!value) {
        xError('"--outDir=" requires a path, e.g. "--outDir=dist"');
        process.exit(1);
      }
      outDir = value;
      continue;
    }
    rest.push(arg);
  }

  if (rest[0] === "run") rest.shift();

  return { command: rest[0], cwd, adapter, outDir };
}

export { compileTailwindAsync } from "./tailwind.js";

const { command, cwd, adapter, outDir: outDirFlag } = parseArgv(Bun.argv.slice(2));
const projectDir = cwd ? resolve(process.cwd(), cwd) : process.cwd();

async function detectOptions(): Promise<{ options: DetectedOptions; configPath: string | null }> {
  const configPath = findConfig(projectDir);
  if (configPath) {
    try {
      const mod = (await import(configPath)) as { default?: Record<string, unknown> };
      return { options: detectOptionsFromConfig(projectDir, mod.default ?? {}), configPath };
    } catch (err) {
      xWarn(`failed to load config: ${String(err)}`);
    }
  }

  return { options: detectDefaultOptions(projectDir), configPath: null };
}

async function cmdDev(): Promise<void> {
  const { options: opts } = await detectOptions();
  const corePath = Bun.resolveSync("@thexjs/core", projectDir);
  const { createApp, installProcessCrashHandlers } = await import(corePath);
  const { port: _port, ...dirs } = opts;

  // Auto-compile Tailwind if a source entry exists
  const twInput = join(projectDir, "src/styles/globals.css");
  const twOutput = join(projectDir, "public/styles.css");
  if (existsSync(twInput)) {
    xInfo("compiling Tailwind CSS...");
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync("bunx", ["tailwindcss", "-i", twInput, "-o", twOutput], {
      cwd: projectDir,
    });
    if (r.status !== 0) xWarn("Tailwind compilation failed, serving raw CSS.");
  }

  // Watch for CSS changes and recompile Tailwind. Must be async (`spawn`, not
  // `spawnSync`): the server is already serving requests by the time a save
  // lands, and Bun is single-threaded — a blocking recompile would freeze every
  // in-flight request and all live-reload sockets for the duration. The pre-boot
  // compile above stays sync, since nothing is serving yet at that point.
  const twSrc = join(projectDir, "src/styles");
  if (existsSync(twSrc)) {
    const { watch } = await import("node:fs");
    let twTimeout: ReturnType<typeof setTimeout> | null = null;
    watch(twSrc, { recursive: true }, () => {
      if (twTimeout) clearTimeout(twTimeout);
      twTimeout = setTimeout(() => {
        xInfo("recompiling Tailwind CSS...");
        compileTailwindAsync(twInput, twOutput, projectDir);
      }, 200);
    }).on("error", (err: NodeJS.ErrnoException) => {
      xWarn(
        `Tailwind file watcher stopped (${err.code ?? err.message}) — restart dev server to resume CSS recompilation`,
      );
    });
  }

  xInfo("dev server starting...");
  // Report crashes outside the request lifecycle (module-eval throws, rejected
  // background promises) through the error reporter instead of dying silently.
  // The prod server gets the same handlers from the generated entry (build.ts).
  installProcessCrashHandlers();
  const app = await createApp({ ...dirs, development: true });
  let port = opts.port;
  let server: ReturnType<typeof Bun.serve> | undefined;
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
    xError("could not find an available port after 20 attempts");
    process.exit(1);
  }
  xSuccess(`dev server running at http://localhost:${port}`);

  let shuttingDown = false;
  function shutdown(signal: string): void {
    if (shuttingDown) return;
    shuttingDown = true;
    xInfo(`received ${signal} - shutting down`);
    // Hard-cap fallback: if `stop(true)` hangs for any reason, don't leave the
    // terminal unresponsive forever.
    const exitFallback = setTimeout(() => process.exit(0), 3000);
    exitFallback.unref?.();
    void server?.stop(true).then(() => {
      clearTimeout(exitFallback);
      process.exit(0);
    });
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

async function cmdBuild(adapterName: string | undefined): Promise<void> {
  const { options: opts, configPath } = await detectOptions();

  xInfo("build starting...");
  const start = performance.now();

  // Compile Tailwind for production
  const twInput = join(projectDir, "src/styles/globals.css");
  const twOutput = join(projectDir, "public/styles.css");
  if (existsSync(twInput)) {
    xInfo("compiling Tailwind CSS (production)...");
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync("bunx", ["tailwindcss", "-i", twInput, "-o", twOutput, "--minify"], {
      cwd: projectDir,
    });
    if (r.status !== 0) xWarn("Tailwind compilation failed.");
  }

  const {
    port: _port,
    security: _security,
    observability: _observability,
    images: _images,
    ...rest
  } = opts;

  if (adapterName === "vercel") {
    let buildVercelOutput: (options: Record<string, unknown>) => Promise<void>;
    try {
      ({ buildVercelOutput } = await import("@thexjs/adapter-vercel"));
    } catch {
      xError('"--adapter vercel" requires @thexjs/adapter-vercel.');
      xError("install it with: bun add -d @thexjs/adapter-vercel");
      process.exit(1);
    }
    await buildVercelOutput({
      ...rest,
      ...(opts.security ? { security: opts.security } : {}),
      ...(opts.observability ? { observability: opts.observability } : {}),
      ...(opts.images ? { images: opts.images } : {}),
      projectRoot: projectDir,
    });
    const ms = Math.round(performance.now() - start);
    xSuccess(`build complete in ${ms}ms -> .vercel/output`);
    return;
  }

  if (adapterName) {
    xError(`unknown adapter "${adapterName}"`);
    process.exit(1);
  }

  const corePath = Bun.resolveSync("@thexjs/core", projectDir);
  const { build } = await import(corePath);
  const outDir = resolve(projectDir, outDirFlag ?? ".x");
  await build({
    ...rest,
    outDir,
    ...(configPath ? { configPath } : {}),
  });

  const ms = Math.round(performance.now() - start);
  xSuccess(`build complete in ${ms}ms -> ${relative(projectDir, outDir)}`);
}

async function cmdStart(): Promise<void> {
  const outDir = resolve(projectDir, outDirFlag ?? ".x");
  const serverEntry = join(outDir, "server", "index.ts");

  if (!existsSync(serverEntry)) {
    const clientDir = join(outDir, "client");
    if (existsSync(join(clientDir, "index.html"))) {
      await serveStaticBuild(clientDir);
      return;
    }
    xError(`no built server found at ${serverEntry}`);
    xError('run "x build" first');
    process.exit(1);
  }

  xInfo("starting production server...");
  const proc = spawn("bun", [serverEntry], {
    stdio: "inherit",
    cwd: projectDir,
    env: { ...process.env, NODE_ENV: "production" },
  });

  // `spawn()`'s return type here is typed against bun-types' lightweight
  // `child_process` stub (this project doesn't pull in `@types/node`), which
  // doesn't declare EventEmitter methods like `.on()` even though Bun's
  // actual runtime child process object supports them. Cast narrowly rather
  // than widening the whole file's node:child_process typing.
  (proc as unknown as { on(event: "exit", listener: (code: number | null) => void): void }).on(
    "exit",
    (code) => process.exit(code ?? 1),
  );
  (proc as unknown as { on(event: "error", listener: (err: Error) => void): void }).on(
    "error",
    (err) => {
      xError(`failed to start bun: ${err.message}`);
      xError("ensure bun is installed — https://bun.sh");
      process.exit(1);
    },
  );
}

async function serveStaticBuild(clientDir: string): Promise<void> {
  const port = Number(process.env.PORT) || 3000;
  xInfo(
    `static build detected — serving ${relative(projectDir, clientDir)} on http://localhost:${port}`,
  );
  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      let pathname: string;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        return new Response("Bad request", { status: 400 });
      }
      if (pathname === "/") pathname = "/index.html";
      const filePath = resolve(clientDir, pathname.startsWith("/") ? pathname.slice(1) : pathname);
      if (!filePath.startsWith(resolve(clientDir) + sep)) {
        return new Response("Forbidden", { status: 403 });
      }
      const file = Bun.file(filePath);
      if (await file.exists()) return new Response(file);
      const index = Bun.file(join(clientDir, "index.html"));
      return new Response(index);
    },
  });
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
  doctor  Diagnose the project: config, dirs, env isolation, dependency health

Options:
  --cwd <dir>          Run as if started inside <dir> (default: current directory)
  --adapter <name>     "build" target adapter, e.g. "vercel" (default: Bun server -> .x/)
  --outDir <dir>       Output directory for "build"/"start" (default: .x)
  -h, --help           Show this help message
  -v, --version        Print the CLI version

Tip: "x run dev" also works, as an alias for "x dev".
Tip: "x build --adapter vercel" emits a .vercel/output tree (Build Output API v3),
     no vercel.json needed. Requires @thexjs/adapter-vercel as a dependency.`);
}

async function main(): Promise<void> {
  if (command === "--version" || command === "-v") {
    printVersion();
    return;
  }

  // Production builds must resolve React (and any other NODE_ENV-conditional
  // packages) to their production builds. Bun keys that off NODE_ENV at
  // process spawn -- mutating process.env afterward has no effect on
  // Bun.build -- so re-exec the build under NODE_ENV=production once.
  if (command === "build" && process.env.NODE_ENV !== "production") {
    const script = process.argv[1] ?? import.meta.path;
    const res = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "production" },
    });
    process.exit(res.status ?? 1);
  }

  switch (command) {
    case "dev":
      await cmdDev();
      break;
    case "build":
      await cmdBuild(adapter);
      break;
    case "start":
      await cmdStart();
      break;
    case "doctor":
      process.exitCode = await runDoctor(projectDir);
      break;
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      // Bare `x` (no command) is a usage error → exit 1.
      // `x --help` / `x -h` is an explicit request → exit 0.
      if (command === undefined) process.exitCode = 1;
      break;
    default:
      xError(`unknown command "${command}"`);
      printHelp();
      process.exit(1);
  }
}

await main();
