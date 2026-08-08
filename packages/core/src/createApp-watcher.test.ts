import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "./createApp";

/**
 * Dev-mode route tree watcher: adding or removing a route file must rebuild
 * the route tree (200ms debounce) so the running app serves the new route and
 * stops serving removed ones. This is the automated version of the "x dev"
 * loop that was previously only exercised by hand.
 *
 * The fixture lives under __fixtures__/ so the project's own src/ dirs are
 * never touched. `__fixtures__/src` must exist for the watcher setup to
 * succeed: createApp watches `projectRoot/src` unconditionally, and node's
 * fs.watch throws ENOENT on a missing directory.
 */
const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/watcher");
const PAGES_DIR = join(FIXTURE_DIR, "pages");
const PROJECT_SRC_DIR = join(import.meta.dir, "__fixtures__/src");

function touch(relPath: string, content: string) {
  const full = join(PAGES_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

async function waitFor(
  fn: () => Promise<boolean>,
  label: string,
  timeoutMs = 8_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out waiting for: ${label}`);
}

beforeAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  rmSync(PROJECT_SRC_DIR, { recursive: true, force: true });
  mkdirSync(PAGES_DIR, { recursive: true });
  mkdirSync(PROJECT_SRC_DIR, { recursive: true });
  touch(
    "index.tsx",
    `export default function Home() {
  return <h1>Home</h1>;
}
`,
  );
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  rmSync(PROJECT_SRC_DIR, { recursive: true, force: true });
});

describe("dev-mode route tree watcher", () => {
  test("serves newly added routes and stops serving removed ones", async () => {
    const app = await createApp({
      pagesDir: PAGES_DIR,
      development: true,
      security: { headers: false },
      observability: { logging: false },
    });

    expect((await app.fetch(new Request("http://localhost/"))).status).toBe(200);
    expect((await app.fetch(new Request("http://localhost/new-route"))).status).toBe(404);

    touch(
      "new-route.tsx",
      `export default function New() {
  return <h1>New Route</h1>;
}
`,
    );
    await waitFor(
      async () => (await app.fetch(new Request("http://localhost/new-route"))).status === 200,
      "new route to appear",
    );
    const added = await app.fetch(new Request("http://localhost/new-route"));
    expect(await added.text()).toContain("New Route");

    rmSync(join(PAGES_DIR, "new-route.tsx"));
    await waitFor(
      async () => (await app.fetch(new Request("http://localhost/new-route"))).status === 404,
      "removed route to disappear",
    );
    expect((await app.fetch(new Request("http://localhost/"))).status).toBe(200);
  });
});
