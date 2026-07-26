#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [command, ...args] = Bun.argv.slice(2);
const projectDir = process.cwd();

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
      return {
        routesDir: cfg.routesDir ?? join(projectDir, "src", "routes"),
        contentDir: cfg.contentDir ?? join(projectDir, "content"),
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

  const { build } = await import("@x/core");
  const outDir = join(projectDir, "dist");

  const buildOpts: { routesDir: string; contentDir?: string; outDir: string } = {
    routesDir: opts.routesDir,
    outDir,
  };
  if (opts.contentDir) buildOpts.contentDir = opts.contentDir;

  await build(buildOpts);

  console.log("[x] build complete");
}

async function cmdStart(): Promise<void> {
  const outDir = join(projectDir, "dist");
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

async function main(): Promise<void> {
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
    default:
      console.log("[x] usage: x <dev|build|start>");
      console.log("  dev   - Start development server with HMR");
      console.log("  build - Build for production (static export + server bundle)");
      console.log("  start - Start production server");
      process.exit(1);
  }
}

await main();
