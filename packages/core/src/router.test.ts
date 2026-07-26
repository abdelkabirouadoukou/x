import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scanRoutes } from "./router";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/routes");

function touch(relPath: string) {
  const full = join(FIXTURE_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, "export default function Page() { return null; }\n");
}

beforeAll(() => {
  touch("index.tsx");
  touch("about.tsx");
  touch("posts/[id].tsx");
  touch("posts/index.tsx");
  touch("docs/[...slug].tsx");
  touch("_layout.tsx"); // should be skipped
});

afterAll(() => {
  rmSync(join(import.meta.dir, "__fixtures__"), { recursive: true, force: true });
});

describe("scanRoutes", () => {
  test("converts file conventions into Bun.serve route patterns", () => {
    const routes = scanRoutes(FIXTURE_DIR);
    const paths = routes.map((r) => r.routePath).sort();

    expect(paths).toEqual(["/", "/about", "/docs/*", "/posts", "/posts/:id"].sort());
  });

  test("skips files and directories starting with an underscore", () => {
    const routes = scanRoutes(FIXTURE_DIR);
    expect(routes.some((r) => r.filePath.includes("_layout"))).toBe(false);
  });
});
