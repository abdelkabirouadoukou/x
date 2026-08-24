#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  spinner,
  text,
} from "@clack/prompts";
import { initGitRepo } from "./git.js";
import { buildPackageJson, resolveVersions } from "./package-json.js";
import {
  BASE_TEMPLATE,
  copyAddon,
  ensureDir,
  FEATURES,
  type FeatureId,
  featureLabel,
  mergeTree,
  normalizeFeatures,
} from "./templates.js";

function abort(message: string): never {
  cancel(message);
  process.exit(1);
}

interface CliOptions {
  projectName?: string;
  features: FeatureId[];
  install: boolean;
  git: boolean;
  runDev: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    features: [],
    install: true,
    git: true,
    runDev: false,
  };

  const positional: string[] = [];
  const nonInteractive: FeatureId[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--template":
      case "-t":
        // Deprecated flag from the previous multi-template design. Ignored —
        // the new generator is feature-based. Kept for back-compat.
        i++;
        break;
      case "--no-install":
        options.install = false;
        break;
      case "--no-git":
        options.git = false;
        break;
      case "--dev":
        options.runDev = true;
        break;
      case "--tailwind":
        nonInteractive.push("tailwind");
        break;
      case "--shadcn":
        nonInteractive.push("shadcn");
        break;
      case "--auth":
        nonInteractive.push("auth");
        break;
      case "--content":
        nonInteractive.push("content");
        break;
      case "--hooks":
        nonInteractive.push("hooks");
        break;
      default:
        if (arg && !arg.startsWith("--")) positional.push(arg);
    }
  }

  const firstPositional = positional[0];
  if (firstPositional) {
    options.projectName = firstPositional;
  }
  if (nonInteractive.length > 0) {
    options.features = Array.from(new Set([...options.features, ...nonInteractive]));
  }
  return options;
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "thexjs-app"
  );
}

// npm strips files named `.gitignore` / `.npmignore` from published tarballs,
// even inside nested directories. Templates therefore ship an `_gitignore`
// file that we rename to `.gitignore` when scaffolding the project.
function finalizeGitignore(targetDir: string): void {
  const from = join(targetDir, "_gitignore");
  if (!existsSync(from)) return;
  const to = join(targetDir, ".gitignore");
  renameSync(from, to);
}

// Same npm dotfile-stripping issue as .gitignore above — ship as `_mcp.json`
// and rename to `.mcp.json` (the Claude Code project-scoped MCP config
// convention) when scaffolding. `.cursor/` gets the same treatment: npm
// strips dot-prefixed paths from tarballs, so the Cursor config ships under
// `_cursor/` and the directory is renamed here.
function finalizeAgentConfigs(targetDir: string): void {
  const mcpFrom = join(targetDir, "_mcp.json");
  if (existsSync(mcpFrom)) {
    renameSync(mcpFrom, join(targetDir, ".mcp.json"));
  }
  const cursorFrom = join(targetDir, "_cursor");
  if (existsSync(cursorFrom)) {
    const cursorTo = join(targetDir, ".cursor");
    if (!existsSync(cursorTo)) {
      renameSync(cursorFrom, cursorTo);
    } else {
      for (const entry of readdirSync(cursorFrom)) {
        cpSync(join(cursorFrom, entry), join(cursorTo, entry));
      }
      rmSync(cursorFrom, { recursive: true, force: true });
    }
  }
}

function buildXConfig(features: FeatureId[]): string {
  const lines: string[] = [];
  lines.push('import { defineConfig } from "@thexjs/core";');
  lines.push("");
  lines.push("export default defineConfig({");
  lines.push('  pagesDir: "src/pages",');
  lines.push('  layoutsDir: "src/layouts",');
  lines.push('  apiDir: "src/api",');
  if (features.includes("content")) {
    lines.push('  contentDir: "content",');
  }
  lines.push("  port: 3000,");
  lines.push("});");
  lines.push("");
  return lines.join("\n");
}

const FEATURE_SELECT_OPTIONS = FEATURES.map((feature) => ({
  value: feature.id,
  label: `${feature.label}${feature.requires ? `  (requires ${feature.requires.join(", ")})` : ""}`,
  hint: feature.hint,
}));

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const interactive = !options.projectName || options.features.length === 0;

  intro("create thexjs-app");

  let projectName = options.projectName;
  let features = options.features;

  if (!projectName) {
    const input = await text({
      message: "What should your project be called?",
      placeholder: "my-thexjs-app",
      defaultValue: "my-thexjs-app",
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Project name is required.";
      },
    });
    if (isCancel(input)) return abort("Cancelled.");
    projectName = input as string;
  }

  const slug = slugify(projectName as string);
  const targetDir = resolve(process.cwd(), slug);

  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    return abort(`Directory "${slug}" already exists and is not empty.`);
  }

  if (features.length === 0) {
    const selected = (await multiselect({
      message: "Which features do you want?",
      options: FEATURE_SELECT_OPTIONS,
      required: false,
      initialValues: FEATURES.filter((f) => f.default).map((f) => f.id),
    })) as FeatureId[] | symbol;

    if (isCancel(selected)) return abort("Cancelled.");
    features = selected as FeatureId[];
  }

  // Enforce feature dependencies via the `requires` metadata (e.g. shadcn
  // implies tailwind). Missing requirements are auto-enabled; the selected
  // features themselves are always kept.
  const { features: normalized, autoEnabled } = normalizeFeatures(features);
  features = normalized;
  for (const { added, because } of autoEnabled) {
    log.warn(
      `${featureLabel(because)} requires ${featureLabel(added)} — enabled ${featureLabel(added)} for you.`,
    );
  }

  if (interactive && options.install) {
    const installOk = (await confirm({
      message: "Install dependencies and initialize a git repo?",
      initialValue: true,
    })) as boolean | symbol;
    if (isCancel(installOk)) return abort("Cancelled.");
    if (!installOk) {
      options.install = false;
      options.git = false;
    }
  }

  const spin = spinner();
  spin.start(`Scaffolding "${slug}"`);

  ensureDir(targetDir);
  mergeTree(BASE_TEMPLATE, targetDir);
  finalizeGitignore(targetDir);
  finalizeAgentConfigs(targetDir);

  for (const feature of features) {
    copyAddon(feature, targetDir);
  }

  spin.message("Resolving latest @thexjs versions");
  const { coreVersion, cliVersion, hooksVersion } = await resolveVersions(features);

  writeFileSync(
    join(targetDir, "package.json"),
    buildPackageJson(slug, features, coreVersion, cliVersion, hooksVersion),
  );
  writeFileSync(join(targetDir, "x.config.ts"), buildXConfig(features));

  spin.stop(`Created ${slug}/`);

  if (options.git) {
    const initSpin = spinner();
    initSpin.start("Initializing git repository (main branch)");
    const result = initGitRepo(targetDir);
    if (result.ok) {
      initSpin.stop(result.message);
    } else {
      initSpin.stop("Git repository not initialized");
      log.warn(result.message);
    }
  }

  let installed = false;
  if (options.install) {
    const hasBun = spawnSync("bun", ["--version"], { stdio: "ignore" }).status === 0;
    if (hasBun) {
      const installSpin = spinner();
      installSpin.start("Installing dependencies (bun install)");
      const result = spawnSync("bun", ["install"], { cwd: targetDir, stdio: "inherit" });
      if (result.status === 0) {
        installSpin.stop("Dependencies installed");
        installed = true;
      } else {
        installSpin.stop("bun install failed — you can retry manually");
      }
    } else {
      log.warn(
        "Bun was not found on your PATH. Install it from https://bun.sh, then run `bun install` inside the project.",
      );
    }
  }

  const summary = ["", `cd ${slug}`, !installed ? "bun install" : "", "bun run dev"]
    .filter(Boolean)
    .join("\n");

  note(summary, "Next steps");

  outro("Your x app is ready!");

  if (options.runDev && installed) {
    const devSpin = spinner();
    devSpin.start("Starting development server");
    const result = spawnSync("bun", ["run", "dev"], { cwd: targetDir, stdio: "inherit" });
    if (result.status !== 0) {
      devSpin.stop("Dev server exited");
    }
  }
}

main().catch((err) => {
  cancel(`Unexpected error: ${err}`);
  process.exit(1);
});
