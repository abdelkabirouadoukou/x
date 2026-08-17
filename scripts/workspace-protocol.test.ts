import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Guard against the `workspace:*` protocol leaking into a published tarball.
 *
 * Bun does not rewrite `workspace:` ranges when it publishes a package, so a
 * manifest that declares `"@thexjs/core": "workspace:*"` ships that literal
 * range to npm. Consumers then hit `Workspace dependency "@thexjs/core" not
 * found` on install (npm publishes actually containing `workspace:*` in
 * @thexjs/adapter-vercel@1.0.6 and @thexjs/auth@3.0.5).
 *
 * Private packages (examples/*) may keep using `workspace:*` — they are never
 * published. Only publishable packages (packages/*) are checked here.
 */

const packageDirs = readdirSync(join(dirname(fileURLToPath(import.meta.url)), "..", "packages"), {
  withFileTypes: true,
});

const manifestPaths = packageDirs
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(entry.parentPath, entry.name, "package.json"));

const DEP_FIELDS = [
  "dependencies",
  "peerDependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

describe("publishable package manifests", () => {
  test("never reference internal packages via the workspace: protocol", () => {
    const offenders: string[] = [];

    for (const manifestPath of manifestPaths) {
      const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (pkg.private) continue;

      for (const field of DEP_FIELDS) {
        for (const [dep, range] of Object.entries(pkg[field] ?? {})) {
          if (typeof range === "string" && range.startsWith("workspace:")) {
            offenders.push(`${manifestPath} (${field}.${dep}: "${range}")`);
          }
        }
      }
    }

    expect(
      offenders,
      "Bun publishes `workspace:*` literally (it does not rewrite the protocol). " +
        "Use a real semver range (e.g. `^1.3.0`) instead, matching packages/cli.",
    ).toEqual([]);
  });
});
