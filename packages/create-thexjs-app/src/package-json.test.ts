import { describe, expect, test } from "bun:test";
import {
  buildPackageJson,
  FALLBACK_CLI_VERSION,
  FALLBACK_CORE_VERSION,
  FALLBACK_HOOKS_VERSION,
  resolveVersions,
} from "./package-json";

const noVersions = async () => null;

describe("buildPackageJson", () => {
  test("places core under dependencies and cli under devDependencies", () => {
    const pkg = buildPackageJson("my-app", [], "1.2.3", "0.9.8");
    const parsed = JSON.parse(pkg) as {
      name?: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(parsed.name).toBe("my-app");
    expect(parsed.dependencies["@thexjs/core"]).toBe("^1.2.3");
    expect(parsed.devDependencies["@thexjs/cli"]).toBe("^0.9.8");
  });

  test("keeps core and cli versions distinct instead of overwriting one another", () => {
    // A fallback-swap bug once passed coreVersion for cliVersion; distinct
    // values make any cross-wiring obvious in the generated package.json.
    const pkg = buildPackageJson("my-app", [], "1.2.2", "1.1.2");
    expect(pkg).toContain('"@thexjs/core": "^1.2.2"');
    expect(pkg).toContain('"@thexjs/cli": "^1.1.2"');
  });

  test("adds hooks only when the feature is selected with a version", () => {
    const withHooks = JSON.parse(buildPackageJson("a", ["hooks"], "1", "1", "1.0.1")) as {
      dependencies: Record<string, string>;
    };
    expect(withHooks.dependencies["@thexjs/hooks"]).toBe("^1.0.1");
    const without = JSON.parse(buildPackageJson("b", [], "1", "1")) as {
      dependencies: Record<string, string>;
    };
    expect(without.dependencies["@thexjs/hooks"]).toBeUndefined();
  });
});

describe("resolveVersions", () => {
  test("uses distinct per-package fallbacks when the registry lookup fails", async () => {
    const versions = await resolveVersions([], noVersions);
    expect(versions.coreVersion).toBe(FALLBACK_CORE_VERSION);
    // The bug: the cli fallback reused FALLBACK_CORE_VERSION. It must use its
    // own constant so the scaffolded @thexjs/cli pins the right version.
    expect(versions.cliVersion).toBe(FALLBACK_CLI_VERSION);
    expect(versions.cliVersion).not.toBe(versions.coreVersion);
  });

  test("falls back per-CO-package independently when some lookups succeed", async () => {
    const versions = await resolveVersions(["hooks"], async (pkg) => {
      if (pkg === "@thexjs/core") return "2.0.0";
      if (pkg === "@thexjs/cli") return null;
      return "0.5.0";
    });
    expect(versions.coreVersion).toBe("2.0.0");
    expect(versions.cliVersion).toBe(FALLBACK_CLI_VERSION);
    expect(versions.hooksVersion).toBe("0.5.0");
  });

  test("propagates successful lookups and omits hooks without the feature", async () => {
    const versions = await resolveVersions([], async (pkg) => {
      if (pkg === "@thexjs/core") return "3.1.0";
      if (pkg === "@thexjs/cli") return "2.4.0";
      return null;
    });
    expect(versions).toEqual({ coreVersion: "3.1.0", cliVersion: "2.4.0" });
  });

  test("falls back for hooks with the feature when its lookup fails", async () => {
    const versions = await resolveVersions(["hooks"], noVersions);
    expect(versions.hooksVersion).toBe(FALLBACK_HOOKS_VERSION);
  });
});
