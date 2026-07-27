#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync, cpSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TEMPLATES, TEMPLATE_NAMES } from "./templates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Templates ship inside the published package at ../templates relative to dist/index.js
const TEMPLATES_ROOT = join(__dirname, "..", "templates");

// Fallback version used if the registry lookup below fails (e.g. offline).
// Bump this when you publish a new @thexjs/core / @thexjs/cli version.
const FALLBACK_CORE_VERSION = "0.1.0";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "thexjs-app";
}

async function fetchLatestVersion(pkg: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://registry.npmjs.org/${pkg}/latest`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

async function prompt(question: string, fallback?: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = fallback ? ` (${fallback})` : "";
  const answer = await rl.question(`${question}${suffix}: `);
  rl.close();
  return answer.trim() || fallback || "";
}

function printBanner(): void {
  console.log("");
  console.log("  create-thexjs-app");
  console.log("  ------------------");
  console.log("");
}

function printTemplateList(): void {
  for (const name of TEMPLATE_NAMES) {
    const meta = TEMPLATES[name]!;
    console.log(`    ${name.padEnd(8)} ${meta.description}`);
  }
}

async function main(): Promise<void> {
  printBanner();

  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith("--"));
  const templateFlagIndex = argv.findIndex((a) => a === "--template" || a === "-t");
  let templateArg =
    templateFlagIndex !== -1 ? argv[templateFlagIndex + 1] : undefined;

  let projectName = positional[0];
  if (!projectName) {
    projectName = await prompt("Project name", "my-thexjs-app");
  }
  const slug = slugify(projectName);
  const targetDir = resolve(process.cwd(), slug);

  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    console.error(`\n[create-thexjs-app] Directory "${slug}" already exists and is not empty.`);
    process.exit(1);
  }

  if (!templateArg || !TEMPLATES[templateArg]) {
    console.log("\n  Available templates:\n");
    printTemplateList();
    console.log("");
    templateArg = await prompt(`Choose a template (${TEMPLATE_NAMES.join("/")})`, "basic");
  }
  if (!TEMPLATES[templateArg]) {
    console.error(`\n[create-thexjs-app] Unknown template "${templateArg}".`);
    process.exit(1);
  }
  const meta = TEMPLATES[templateArg]!;
  const templateDir = join(TEMPLATES_ROOT, templateArg);

  console.log(`\n[create-thexjs-app] Scaffolding "${slug}" from the "${templateArg}" template...`);
  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, { recursive: true });

  console.log("[create-thexjs-app] Resolving latest @thexjs package versions...");
  const coreVersion = (await fetchLatestVersion("@thexjs/core")) ?? FALLBACK_CORE_VERSION;
  const cliVersion = (await fetchLatestVersion("@thexjs/cli")) ?? FALLBACK_CORE_VERSION;

  const pkgJson = {
    name: slug,
    private: true,
    type: "module",
    scripts: {
      dev: "x dev",
      build: "x build",
      start: "x start",
    },
    dependencies: {
      "@thexjs/core": `^${coreVersion}`,
      ...meta.dependencies,
    },
    devDependencies: {
      "@thexjs/cli": `^${cliVersion}`,
      ...meta.devDependencies,
    },
  };
  writeFileSync(join(targetDir, "package.json"), `${JSON.stringify(pkgJson, null, 2)}\n`);

  console.log(`[create-thexjs-app] Created ${slug}/`);

  const hasBun = spawnSync("bun", ["--version"], { stdio: "ignore" }).status === 0;
  if (hasBun) {
    console.log("[create-thexjs-app] Installing dependencies with bun install...");
    const result = spawnSync("bun", ["install"], { cwd: targetDir, stdio: "inherit" });
    if (result.status !== 0) {
      console.warn("[create-thexjs-app] bun install failed — you can retry manually.");
    }
  } else {
    console.warn(
      "[create-thexjs-app] Bun was not found on your PATH. Install it from https://bun.sh, " +
        "then run `bun install` inside the project — the x framework requires Bun to run.",
    );
  }

  console.log("");
  console.log("  Done! Next steps:");
  console.log("");
  console.log(`    cd ${slug}`);
  if (!hasBun) console.log("    bun install");
  console.log("    bun run dev");
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
