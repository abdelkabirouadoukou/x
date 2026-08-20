// Pure, side-effect-free helpers for stamping out a scaffolded project's
// package.json. Kept separate from index.ts so tests can exercise them
// without triggering the CLI's `main()` entrypoint.

import { BASE_DEPENDENCIES, BASE_DEV_DEPENDENCIES, FEATURES, type FeatureId } from "./templates.js";

// Fallback versions used if the registry lookup fails (e.g. offline).
// Keep in sync with the latest published @thexjs/* versions on npm
// (tracked by issue #151). Bump these when you publish a new package version.
export const FALLBACK_CORE_VERSION = "1.6.0";
export const FALLBACK_CLI_VERSION = "1.1.2";
export const FALLBACK_HOOKS_VERSION = "0.2.0";

export interface ResolvedVersions {
  coreVersion: string;
  cliVersion: string;
  hooksVersion?: string;
}

/**
 * Resolves the @thexjs package versions for a scaffolded project, falling
 * back to pinned constants when the registry lookup fails (offline / outage).
 * Each package falls back to its OWN constant — reusing another package's
 * fallback (e.g. core's for cli) would silently pin the wrong version in the
 * generated package.json.
 */
export async function resolveVersions(
  features: FeatureId[],
  fetchVersion: (
    pkg: "@thexjs/core" | "@thexjs/cli" | "@thexjs/hooks",
  ) => Promise<string | null> = fetchLatestVersion,
): Promise<ResolvedVersions> {
  const coreVersion = (await fetchVersion("@thexjs/core")) ?? FALLBACK_CORE_VERSION;
  const cliVersion = (await fetchVersion("@thexjs/cli")) ?? FALLBACK_CLI_VERSION;
  const hooksVersion = features.includes("hooks")
    ? ((await fetchVersion("@thexjs/hooks")) ?? FALLBACK_HOOKS_VERSION)
    : undefined;
  return { coreVersion, cliVersion, ...(hooksVersion !== undefined ? { hooksVersion } : {}) };
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

export function buildPackageJson(
  name: string,
  features: FeatureId[],
  coreVersion: string,
  cliVersion: string,
  hooksVersion?: string,
): string {
  const dependencies: Record<string, string> = {
    ...BASE_DEPENDENCIES,
    "@thexjs/core": `^${coreVersion}`,
  };
  const devDependencies: Record<string, string> = {
    ...BASE_DEV_DEPENDENCIES,
    "@thexjs/cli": `^${cliVersion}`,
  };

  if (features.includes("hooks") && hooksVersion) {
    dependencies["@thexjs/hooks"] = `^${hooksVersion}`;
  }

  for (const feature of features) {
    const meta = FEATURES.find((f) => f.id === feature);
    if (!meta) continue;
    Object.assign(dependencies, meta.dependencies);
    Object.assign(devDependencies, meta.devDependencies);
  }

  const pkg = {
    name,
    private: true,
    type: "module",
    scripts: {
      dev: "x dev",
      build: "x build",
      start: "x start",
    },
    dependencies,
    devDependencies,
  };

  return `${JSON.stringify(pkg, null, 2)}\n`;
}
