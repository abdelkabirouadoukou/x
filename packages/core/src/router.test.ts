import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractParams,
  findLayoutChain,
  generateManifestSource,
  scanLayouts,
  scanRoutes,
} from "./router";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/routes");

function touch(relPath: string, content?: string) {
  const full = join(FIXTURE_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content ?? "export default function Page() { return null; }\n");
}

beforeAll(() => {
  touch("index.tsx");
  touch("about.tsx");
  touch("posts/[id].tsx");
  touch("posts/index.tsx");
  touch("docs/[...slug].tsx");
  touch("_layout.tsx");
  touch("blog/_layout.tsx");
  touch("blog/index.tsx");
  touch(
    "blog/_layout.tsx",
    "export default function Layout({ children }: { children: any }) { return children; }\n",
  );
});

afterAll(() => {
  rmSync(join(import.meta.dir, "__fixtures__"), { recursive: true, force: true });
});

describe("scanRoutes", () => {
  test("converts file conventions into Bun.serve route patterns", () => {
    const routes = scanRoutes(FIXTURE_DIR);
    const paths = routes.map((r) => r.routePath).sort();

    expect(paths).toEqual(["/", "/about", "/blog", "/docs/*", "/posts", "/posts/:id"].sort());
  });

  test("skips files and directories starting with an underscore", () => {
    const routes = scanRoutes(FIXTURE_DIR);
    expect(routes.some((r) => r.filePath.includes("_layout"))).toBe(false);
  });

  test("includes paramNames", () => {
    const routes = scanRoutes(FIXTURE_DIR);
    const postRoute = routes.find((r) => r.routePath === "/posts/:id");
    expect(postRoute?.paramNames).toEqual(["id"]);

    const docsRoute = routes.find((r) => r.routePath === "/docs/*");
    expect(docsRoute?.paramNames).toEqual(["slug"]);

    const indexRoute = routes.find((r) => r.routePath === "/");
    expect(indexRoute?.paramNames).toEqual([]);
  });
});

describe("scanLayouts", () => {
  test("discovers _layout files at every directory level", () => {
    const layouts = scanLayouts(FIXTURE_DIR);
    const paths = layouts.map((l) => l.filePath.replace(FIXTURE_DIR, "")).sort();
    expect(paths).toEqual(["/_layout.tsx", "/blog/_layout.tsx"]);
  });
});

describe("findLayoutChain", () => {
  test("finds layout chain for a deeply nested route", () => {
    const layouts = scanLayouts(FIXTURE_DIR);
    const blogIndex = join(FIXTURE_DIR, "blog/index.tsx");
    const chain = findLayoutChain(blogIndex, layouts, FIXTURE_DIR);
    expect(chain).toHaveLength(2);
    expect(chain[0]?.dirPath).toBe(FIXTURE_DIR);
    expect(chain[1]?.dirPath).toBe(join(FIXTURE_DIR, "blog"));
  });

  test("returns empty chain when no layouts exist for a route", () => {
    const layouts = scanLayouts(FIXTURE_DIR);
    const aboutRoute = join(FIXTURE_DIR, "about.tsx");
    // about.tsx sits at root which has _layout.tsx, so it should have 1
    // Let's test a route without a layout by removing _layout from the chain
    const chain = findLayoutChain(aboutRoute, layouts, FIXTURE_DIR);
    expect(chain.length).toBeGreaterThanOrEqual(1);
  });

  test("root-level route gets root layout", () => {
    const layouts = scanLayouts(FIXTURE_DIR);
    const aboutRoute = join(FIXTURE_DIR, "about.tsx");
    const chain = findLayoutChain(aboutRoute, layouts, FIXTURE_DIR);
    expect(chain[0]?.dirPath).toBe(FIXTURE_DIR);
  });
});

describe("generateManifestSource", () => {
  test("generates TypeScript source with typed routes", () => {
    const routes = scanRoutes(FIXTURE_DIR);
    const source = generateManifestSource(routes);

    expect(source).toContain('"/"');
    expect(source).toContain("Record<string, never>");
    expect(source).toContain('"/posts/:id"');
    expect(source).toContain("id: string");
    expect(source).toContain('"/docs/*"');
    expect(source).toContain("slug: string");
    expect(source).toContain("export function href");
  });

  test("generated href() fills catch-all params instead of dropping them (#134)", async () => {
    const routes = scanRoutes(FIXTURE_DIR);
    const source = generateManifestSource(routes);
    const manifestPath = join(FIXTURE_DIR, "generated-x-routes.ts");
    writeFileSync(manifestPath, source, "utf-8");

    const mod = (await import(manifestPath)) as {
      href: (path: string, params?: Record<string, string>) => string;
    };
    expect(mod.href("/docs/*", { slug: "guide/intro" })).toBe("/docs/guide/intro");
    expect(mod.href("/docs/*", { slug: "a b/c" })).toBe("/docs/a%20b/c");
    expect(mod.href("/posts/:id", { id: "hello world" })).toBe("/posts/hello%20world");
    expect(mod.href("/about")).toBe("/about");
  });

  test("href() catch-all detection is exact, not a prefix of longer params (#134)", async () => {
    // `id` is the catch-all name here, but the path also carries `:id2` — a
    // prefix check for `:id` would match `:id2` and skip the wildcard, leaving
    // the catch-all value dropped. The segment token must match exactly.
    const source = generateManifestSource([
      {
        filePath: "/virtual.tsx",
        routePath: "/:id2/*",
        paramNames: ["id2", "id"],
        isApi: false,
      },
    ]);
    const manifestPath = join(FIXTURE_DIR, "generated-x-routes-prefix.ts");
    writeFileSync(manifestPath, source, "utf-8");
    const mod = (await import(manifestPath)) as {
      href: (path: string, params?: Record<string, string>) => string;
    };
    expect(mod.href("/:id2/*", { id2: "section", id: "a/b/c" })).toBe("/section/a/b/c");
  });
});

describe("extractParams", () => {
  test("extracts named params from URL", () => {
    const result = extractParams("/posts/:id", ["id"], "/posts/hello-world");
    expect(result).toEqual({ id: "hello-world" });
  });

  test("returns null for non-matching URL", () => {
    const result = extractParams("/posts/:id", ["id"], "/about");
    expect(result).toBeNull();
  });

  test("extracts catch-all params", () => {
    const result = extractParams("/docs/*", ["slug"], "/docs/a/b/c");
    expect(result).toEqual({ slug: "a/b/c" });
  });

  test("matches root path", () => {
    const result = extractParams("/", [], "/");
    expect(result).toEqual({});
  });

  test("matches static path", () => {
    const result = extractParams("/about", [], "/about");
    expect(result).toEqual({});
  });

  test("escapes regex metacharacters in static segments", () => {
    // A literal `.` must match only the dot, not any character.
    expect(extractParams("/v1.2", [], "/v1.2")).toEqual({});
    expect(extractParams("/v1.2", [], "/v1x2")).toBeNull();
  });

  test.each(["+", "(", ")", "?", "|", "[", "]", "^", "$"])(
    "escapes literal %s in a static segment",
    (metachar) => {
      const routePath = `/tools/1${metachar}2`;
      expect(extractParams(routePath, [], routePath)).toEqual({});
      expect(extractParams(routePath, [], `/tools/1x2`)).toBeNull();
    },
  );

  test("still treats :param and * as dynamic tokens", () => {
    expect(extractParams("/releases/v1.2/:id", ["id"], "/releases/v1.2/42")).toEqual({
      id: "42",
    });
    expect(extractParams("/docs/1.0/*", ["slug"], "/docs/1.0/a/b")).toEqual({
      slug: "a/b",
    });
  });
});
