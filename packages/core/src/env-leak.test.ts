import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "./build";
import { buildIslandBundleInMemory } from "./island-bundle";
import { EnvLeakageError } from "./security/env-isolation";

/**
 * Env isolation tests stub `Bun.build` so they exercise the leak-handling
 * logic deterministically instead of depending on the real React bundler.
 *
 * Real bundling IS covered elsewhere (build.test.ts bundles islands end to
 * end, security.test.ts pins `assertNoEnvLeakage`). Here we need to prove the
 * *handling*: a leaking bundle is the very React/runtime that Bun resolves
 * from its store, and repeated browser-target builds can intermittently hit a
 * pre-existing Bun store race ("EISDIR / Unexpected reading file …
 * node_modules/.bun/react…") when many test workers run concurrently. Stubbing
 * removes that environmental flake while keeping the assertions exact.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/env-leak");
const ROUTES_DIR = join(FIXTURE_DIR, "src/routes");
const ISLAND_PATH = join(import.meta.dir, "island.tsx");
const LEAK_ROUTE = join(ROUTES_DIR, "leaky.tsx");
const CLEAN_ROUTE = join(ROUTES_DIR, "clean.tsx");
const OUT_DIR = join(FIXTURE_DIR, "dist");

const LEAKY_BUNDLE_CODE = `const secret = process.env.API_SECRET_TOKEN;
function render() { return secret; }`;
const CLEAN_BUNDLE_CODE = `import { hydrateRoot } from "react-dom/client";
const ok = 42;
hydrateRoot(document, null);
console.log(ok);`;

let buildSpy: ReturnType<typeof spyOn>;

function fakeBuildFor(opts: { entrypoints?: (string | URL)[] }): {
  success: boolean;
  outputs: Array<{ kind: "entry-point"; text: () => Promise<string> }>;
  logs: unknown[];
} {
  const entry = String(opts.entrypoints?.[0] ?? "");
  const code = entry.includes("leaky") ? LEAKY_BUNDLE_CODE : CLEAN_BUNDLE_CODE;
  return {
    success: true,
    outputs: [{ kind: "entry-point", text: async () => code }],
    logs: [],
  };
}

function writeRoute(path: string, body: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, body);
}

beforeAll(() => {
  writeRoute(
    LEAK_ROUTE,
    `import { Island } from "${pathToFileURL(ISLAND_PATH).href}";

export function Leaky() {
  const secret = process.env.API_SECRET_TOKEN;
  return <button>{secret}</button>;
}

export const islands = { Leaky };

export const mode = "static";

export default function LeakPage() {
  return (
    <main>
      <h1>Leak</h1>
      <Island name="Leaky" client="idle">
        <Leaky />
      </Island>
    </main>
  );
}
`,
  );
  writeRoute(
    CLEAN_ROUTE,
    `import { Island } from "${pathToFileURL(ISLAND_PATH).href}";

export function Counter() {
  const count = 0;
  return <button>{count}</button>;
}

export const islands = { Counter };

export const mode = "static";

export default function CleanPage() {
  return (
    <main>
      <h1>Clean</h1>
      <Island name="Counter" client="idle">
        <Counter />
      </Island>
    </main>
  );
}
`,
  );

  buildSpy = spyOn(Bun, "build");
  buildSpy.mockImplementation(async (opts: Parameters<typeof Bun.build>[0]) =>
    fakeBuildFor(opts ?? { entrypoints: [] }),
  );
});

afterAll(() => {
  buildSpy.mockRestore();
  rmSync(join(import.meta.dir, "__fixtures__/env-leak"), { recursive: true, force: true });
});

describe("production build env isolation", () => {
  test("a build with a leaking island fails loudly with EnvLeakageError", async () => {
    await expect(build({ routesDir: ROUTES_DIR, outDir: OUT_DIR })).rejects.toThrow(
      EnvLeakageError,
    );

    // The aborted build must not leave a silently-degraded stub claiming
    // success: either the islands dir holds real (non-leaking) bundles, or —
    // since the build aborted on the leak — no client output at all. Also,
    // whatever bundle it did emit, the secret never reaches the client.
    const clientDir = join(OUT_DIR, "client");
    const islandsDir = join(clientDir, "_islands");
    expect(existsSync(islandsDir) || !existsSync(join(clientDir, "index.html"))).toBe(true);
    expect(existsSync(join(clientDir, "leaky/index.html"))).toBe(false);
  });
});

describe("dev-mode island env isolation", () => {
  test("a leaking island serves the fallback stub and logs a SECURITY warning without crashing", async () => {
    const errorSpy = spyOn(console, "error");
    try {
      const code = await buildIslandBundleInMemory(
        LEAK_ROUTE,
        [],
        ["Leaky"],
        new Map(),
        FIXTURE_DIR,
      );

      // Dev keeps serving so iteration continues, but only a stub. The
      // stub's distinctive marker is the "not hydrated" attribute — the
      // real React bundle also contains the ASCII word "fallback" in
      // internals, so match the marker, not the word.
      expect(code).toContain("data-island-hydrated");
      expect(code).not.toContain("API_SECRET_TOKEN");

      // The warning is visually distinct (🔒 + SECURITY) so it can't be
      // mistaken for a routine hot-reload build error.
      const warnings = errorSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(warnings).toContain("🔒");
      expect(warnings).toContain("SECURITY:");
      expect(warnings).toContain("API_SECRET_TOKEN");
    } finally {
      errorSpy.mockRestore();
    }
  });

  test("a clean island bundles normally without a SECURITY warning", async () => {
    const errorSpy = spyOn(console, "error");
    try {
      const code = await buildIslandBundleInMemory(
        CLEAN_ROUTE,
        [],
        ["Counter"],
        new Map(),
        FIXTURE_DIR,
      );
      expect(code).not.toContain("data-island-hydrated");
      expect(code).toContain("hydrateRoot");
      expect(code.length).toBeGreaterThan(50);
      expect(errorSpy.mock.calls.length).toBe(0);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
