import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildIslandBundleInMemory } from "./island-bundle";

/**
 * Dev-mode env isolation lives in its own file so this process can make the
 * dev bundle the FIRST browser-target Bun.build it runs. Bun 1.3.x has an
 * intermittent in-process race where later browser bundles mis-resolve react
 * from the node_modules module store ("Unexpected reading file … react/…"),
 * so keeping these bundles to a fresh process makes the test deterministic.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/env-leak-dev");
const ROUTES_DIR = join(FIXTURE_DIR, "src/routes");
const ISLAND_PATH = join(import.meta.dir, "island.tsx");
const LEAK_ROUTE = join(ROUTES_DIR, "leaky.tsx");
const CLEAN_ROUTE = join(ROUTES_DIR, "clean.tsx");

function writeRoute(path: string, body: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, body);
}

beforeAll(() => {
  writeRoute(
    LEAK_ROUTE,
    `import { Island } from "${ISLAND_PATH}";

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
    `import { Island } from "${ISLAND_PATH}";

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
});

afterAll(() => {
  rmSync(join(import.meta.dir, "__fixtures__/env-leak-dev"), { recursive: true, force: true });
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
