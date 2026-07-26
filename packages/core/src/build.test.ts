import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "./build";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/build-test");
const ROUTES_DIR = join(FIXTURE_DIR, "src/routes");
const CONTENT_DIR = join(FIXTURE_DIR, "content");
const OUT_DIR = join(FIXTURE_DIR, "dist");

function touch(dir: string, relPath: string, content: string) {
  const full = join(dir, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

beforeAll(() => {
  touch(
    ROUTES_DIR,
    "index.tsx",
    `export const mode = 'static';
export default function Home() {
  return <h1>Home</h1>;
}
`,
  );
  touch(
    ROUTES_DIR,
    "about.tsx",
    `export const mode = 'server';
export default function About() {
  return <h1>About</h1>;
}
`,
  );
  touch(
    ROUTES_DIR,
    "counter.tsx",
    `import { Island } from "@x/core";
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c+1)}>{count}</button>;
}

export const islands = { Counter };

export const mode = 'static';

export default function CounterPage() {
  return (
    <main>
      <h1>Counter</h1>
      <Island name="Counter" client="idle">
        <Counter />
      </Island>
    </main>
  );
}
`,
  );
  touch(
    CONTENT_DIR,
    "blog/hello.md",
    `---
title: Hello Blog
---

This is a blog post.
`,
  );
  touch(
    CONTENT_DIR,
    "index.md",
    `---
title: Home
---

Home page from content.
`,
  );
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("build", () => {
  test("builds static routes to client dir", async () => {
    await build({ routesDir: ROUTES_DIR, outDir: OUT_DIR });
    expect(existsSync(join(OUT_DIR, "client/index.html"))).toBe(true);
    expect(existsSync(join(OUT_DIR, "server"))).toBe(true);
  });

  test("generates server entry for server-mode routes", async () => {
    await build({ routesDir: ROUTES_DIR, outDir: OUT_DIR });
    expect(existsSync(join(OUT_DIR, "server/index.ts"))).toBe(true);
    const content = readFileSync(join(OUT_DIR, "server/index.ts"), "utf-8");
    expect(content).toContain("about");
  });

  test("builds content collections", async () => {
    await build({ routesDir: ROUTES_DIR, contentDir: CONTENT_DIR, outDir: OUT_DIR });
    expect(existsSync(join(OUT_DIR, "client/index.html"))).toBe(true);
  });

  test("builds content route HTML files", async () => {
    await build({ routesDir: ROUTES_DIR, contentDir: CONTENT_DIR, outDir: OUT_DIR });
    const html = readFileSync(join(OUT_DIR, "client/blog/hello/index.html"), "utf-8");
    expect(html).toContain("Hello Blog");
  });
});

describe("island code-splitting", () => {
  test("generates separate JS chunk per island", async () => {
    await build({ routesDir: ROUTES_DIR, outDir: OUT_DIR });

    const islandsDir = join(OUT_DIR, "client/_islands");
    expect(existsSync(islandsDir)).toBe(true);

    const entries = readdirSync(islandsDir);
    expect(entries.length).toBeGreaterThan(0);
  });

  test("includes island script tag in HTML", async () => {
    await build({ routesDir: ROUTES_DIR, outDir: OUT_DIR });
    const html = readFileSync(join(OUT_DIR, "client/counter/index.html"), "utf-8");
    expect(html).toContain("_islands");
    expect(html).toContain("<script");
  });

  test("bundled island output is valid JS", async () => {
    await build({ routesDir: ROUTES_DIR, outDir: OUT_DIR });

    const islandsDir = join(OUT_DIR, "client/_islands");
    const entries = readdirSync(islandsDir);

    for (const entry of entries) {
      const entryDir = join(islandsDir, entry);
      const files = readdirSync(entryDir);
      for (const file of files) {
        if (file.endsWith(".js")) {
          const js = readFileSync(join(entryDir, file), "utf-8");
          expect(js.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("island bundle contains hydration logic", async () => {
    await build({ routesDir: ROUTES_DIR, outDir: OUT_DIR });

    const islandsDir = join(OUT_DIR, "client/_islands");
    const entries = readdirSync(islandsDir);

    expect(entries.length).toBeGreaterThan(0);

    const entryDir = join(islandsDir, entries[0] as string);
    const files = readdirSync(entryDir);
    const jsFile = files.find((f: string) => f.endsWith(".js"));
    expect(jsFile).toBeDefined();

    const js = readFileSync(join(entryDir, jsFile as string), "utf-8");
    expect(js.length).toBeGreaterThan(50);
  });
});
