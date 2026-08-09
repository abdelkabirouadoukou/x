import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findLeakedEnvKeys } from "@thexjs/core";
import { detectOptionsFromConfig, findConfig } from "./config-detect.js";
import { xDim, xError, xInfo, xSuccess, xWarn } from "./terminal.js";

function walkTs(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.startsWith("_") || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...walkTs(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

export async function runDoctor(projectDir: string): Promise<number> {
  let failures = 0;
  const bad = (msg: string) => {
    failures += 1;
    xError(msg);
  };

  xInfo(`diagnosing project at ${projectDir}`);

  // 1. Bun version
  const parts = Bun.version.split(".");
  const major = Number(parts[0] ?? 0);
  const minor = Number(parts[1] ?? 0);
  if (major > 1 || (major === 1 && minor >= 3)) {
    xSuccess(`Bun ${Bun.version} (>= 1.3 required)`);
  } else {
    bad(`Bun ${Bun.version} is too old — x requires >= 1.3`);
  }

  // 2. Config present + parses
  const configPath = findConfig(projectDir);
  if (!configPath) {
    bad("no x.config.ts / x.config.js / x.config.mjs found (defaults will be used)");
  } else {
    try {
      await import(configPath);
      xSuccess(`config loads: ${relative(projectDir, configPath)}`);
    } catch (err) {
      bad(`config failed to load: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Resolve effective dirs (from config if present, else defaults)
  let opts = detectOptionsFromConfig(projectDir, {});
  if (configPath) {
    try {
      const mod = (await import(configPath)) as { default?: Record<string, unknown> };
      opts = detectOptionsFromConfig(projectDir, mod.default ?? {});
    } catch {
      // config load failure already reported above
    }
  }
  const pagesDir = opts.pagesDir ?? join(projectDir, "src", "pages");
  const apiDir = opts.apiDir;
  const actionsDir = opts.actionsDir;
  const contentDir = opts.contentDir;
  const layoutsDir = opts.layoutsDir;
  const publicDir = join(projectDir, "public");

  // 4. Expected directories exist
  const dirs: [string, string][] = [
    ["pages", pagesDir],
    ["api", apiDir ?? join(projectDir, "src", "api")],
    ["actions", actionsDir ?? join(projectDir, "src", "actions")],
    ["layouts", layoutsDir ?? join(projectDir, "src", "layouts")],
    ["content", contentDir ?? join(projectDir, "content")],
    ["public", publicDir],
  ];
  for (const [label, dir] of dirs) {
    if (isDir(dir)) xSuccess(`found ${label}/`);
    else xWarn(`missing ${label}/ (${relative(projectDir, dir)})`);
  }

  // 5. Route tree compiles
  const routeFiles = walkTs(pagesDir);
  if (routeFiles.length === 0) {
    bad(`no route files found under ${relative(projectDir, pagesDir)}/`);
  } else {
    xSuccess(`route tree: ${routeFiles.length} file(s) under pages/`);
  }

  // 6. @thexjs/* deps installed
  const nm = join(projectDir, "node_modules", "@thexjs");
  if (!isDir(nm)) {
    bad("node_modules/@thexjs is missing — run `bun install`");
  } else {
    const names = readdirSync(nm).filter((n) => isDir(join(nm, n)));
    xSuccess(`@thexjs packages installed: ${names.length > 0 ? names.join(", ") : "(none)"}`);
  }

  // 7. Rich: env-var isolation scan across client-shipped source. Only island
  // modules are bundled into browser JS (see island-bundle.ts): plain pages
  // and loaders render server-side, and actions are rewritten to fetch()
  // wrappers. So scan files that export an `islands` map -- that's the one
  // surface whose env references could reach the client bundle.
  //
  // This is a source-level heuristic, not the real gate: `x build` runs
  // assertNoEnvLeakage on the compiled bundle, which is the authoritative
  // check. Docstring examples that merely print `process.env.*` names never
  // reach a client chunk, so this reports warnings instead of failing.
  let leaks = 0;
  if (pagesDir && isDir(pagesDir)) {
    for (const file of walkTs(pagesDir)) {
      let code: string;
      try {
        code = readFileSync(file, "utf-8");
      } catch {
        continue;
      }
      const hasIslands = /\bexport\s+(?:const|function)\s+islands\b/.test(code);
      if (!hasIslands) continue;
      const keys = findLeakedEnvKeys(code);
      if (keys.length > 0) {
        leaks += 1;
        xWarn(
          `${relative(projectDir, file)}: ${keys.join(", ")} referenced in island source — if reachable from a client bundle, prefix with ${"THEXJS_PUBLIC_"} or move into a loader/action (x build enforces this)`,
        );
      }
    }
  }
  if (leaks === 0) {
    xSuccess("no non-THEXJS_PUBLIC_ env references in island (client-bound) source");
  }

  // 8. Rich: installed @thexjs package version consistency
  let pkgRoot: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkgRoot = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    pkgRoot = {};
    xWarn("no readable package.json — skipping dependency version audit");
  }
  const declared: Record<string, string> = {
    ...(pkgRoot.dependencies ?? {}),
    ...(pkgRoot.devDependencies ?? {}),
  };
  const installedVersions = new Map<string, string>();
  try {
    for (const name of readdirSync(nm)) {
      try {
        const pkg = JSON.parse(readFileSync(join(nm, name, "package.json"), "utf-8")) as {
          version?: string;
        };
        if (pkg.version) installedVersions.set(name, pkg.version);
      } catch {
        // skip unreadable package
      }
    }
  } catch {
    // already reported as missing node_modules/@thexjs
  }
  for (const [name, range] of Object.entries(declared)) {
    if (!name.startsWith("@thexjs/")) continue;
    // workspace:* is a monorepo link, not a version contract -- skip.
    if (range === "workspace:*") continue;
    const short = name.slice("@thexjs/".length);
    const installed = installedVersions.get(short);
    if (installed && range !== "*" && !range.startsWith("^") && !range.startsWith("~")) {
      if (installed !== range) {
        xWarn(`${name}: declared ${range}, installed ${installed}`);
      }
    }
  }

  // 9. Rich: auth secret present in production
  if (process.env.NODE_ENV === "production") {
    const hasAuth = Object.keys(declared).some((d) => d === "@thexjs/auth");
    if (hasAuth && !process.env.AUTH_SECRET) {
      bad("@thexjs/auth is used but AUTH_SECRET is not set in this environment");
    }
  }

  xDim("");
  if (failures > 0) {
    xError(`doctor found ${failures} problem(s)`);
    return 1;
  }
  xSuccess("no problems found");
  return 0;
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
