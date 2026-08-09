import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "./build";
import { EnvLeakageError } from "./security/env-isolation";

/**
 * Env isolation is deliberately tested from a dedicated file: it bundles
 * React islands via Bun.build, and the browser pre-Ill bundle path must be
 * the first thing this process builds so an in-process React import can't
 * perturb the isolated module store resolution.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/env-leak");
const ROUTES_DIR = join(FIXTURE_DIR, "src/routes");
const ISLAND_PATH = join(import.meta.dir, "island.tsx");
const LEAK_ROUTE = join(ROUTES_DIR, "leaky.tsx");
const CLEAN_ROUTE = join(ROUTES_DIR, "clean.tsx");
const OUT_DIR = join(FIXTURE_DIR, "dist");

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
    if (existsSync(islandsDir)) {
      for (const entry of readdirSync(islandsDir)) {
        const entryDir = join(islandsDir, entry);
        for (const file of readdirSync(entryDir)) {
          if (!file.endsWith(".js")) continue;
          const js = readFileSync(join(entryDir, file), "utf-8");
          expect(js).not.toContain("API_SECRET_TOKEN");
        }
      }
    }
    expect(existsSync(islandsDir) || !existsSync(join(clientDir, "index.html"))).toBe(true);
  });
});
