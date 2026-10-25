#!/usr/bin/env bun
/**
 * Fails if bun.lock workspace versions are out of sync with package.json.
 * Bun's --frozen-lockfile does not currently fail on workspace package
 * version drift (e.g. 1.8.2 vs 1.8.3), so this explicit check prevents
 * silent drift after `changeset version` bumps package.json without a
 * `bun install`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const lockText = readFileSync("bun.lock", "utf-8");

// Extract workspace entries: `"packages/core": { "name": "...", "version": "x.y.z", ... }`
const workspaceVersionRe = /"([^"]+)":\s*\{\s*"name":\s*"[^"]+",\s*"version":\s*"([^"]+)"/g;

let ok = true;
let checked = 0;
for (const match of lockText.matchAll(workspaceVersionRe)) {
  const workspacePath = match[1];
  const lockVersion = match[2];
  // Only care about our own workspaces (packages/*, examples/*, root "")
  // Root workspace has path "" and name x-monorepo — skip it.
  if (workspacePath === "") continue;
  const pkgPath = join(workspacePath, "package.json");
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const pkgVersion = pkg.version;
  if (!pkgVersion) continue;
  checked++;
  if (pkgVersion !== lockVersion) {
    console.error(
      `Version drift: ${workspacePath}/package.json is ${pkgVersion} but bun.lock has ${lockVersion}`,
    );
    ok = false;
  }
}

if (checked === 0) {
  console.error("No workspace versions found in bun.lock — check pattern");
  process.exit(1);
}

if (!ok) {
  console.error(
    `\nFound ${checked} workspaces with drift. Fix with: bun install && shasum -a 256 bun.lock | cut -d' ' -f1 > .github/bun-lock.sha256`,
  );
  process.exit(1);
}

console.log(`bun.lock workspace versions verified (${checked} workspaces in sync)`);
