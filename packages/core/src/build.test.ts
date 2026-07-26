import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
