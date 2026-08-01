import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { generateEntrySource } from "./generate-entry";
import { buildVercelOutput } from "./index";
import { writeConfigJson } from "./write-output";
import type { BuildManifest } from "./types";

/**
 * The Vercel adapter had a real production bug: server-rendered pages shipped
 * without a stylesheet <link> because the href was resolved at runtime inside
 * the serverless sandbox, where `public/` doesn't exist. This suite pins the
 * build output contract so that class of regression can't come back:
 * config.json routing, the static/ payload, and the stylesheetHref baked into
 * the render function. Before this file, the adapter had zero tests.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/adapter");
const PAGES_DIR = join(FIXTURE_DIR, "src/pages");
const API_DIR = join(FIXTURE_DIR, "src/api");
const PUBLIC_DIR = join(FIXTURE_DIR, "public");
const OUTPUT_DIR = join(FIXTURE_DIR, ".vercel/output");

function touch(dir: string, relPath: string, content: string) {
  const full = join(dir, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

function unitManifest(overrides: Partial<BuildManifest> = {}): BuildManifest {
  return {
    pagesDirLabel: "src/pages",
    routes: [
      {
        routePath: "/about",
        paramNames: [],
        isApi: false,
        mode: "server",
        route: {
          sourcePath: "/fixture/about.tsx",
          compiledPath: "/fixture/compiled/about.mjs",
          identifier: "route_about",
        },
        layoutChain: [],
        middlewareChain: [],
      },
    ],
    actions: [],
    hasServerSurface: true,
    ...overrides,
  };
}

describe("writeConfigJson", () => {
  const out = join(FIXTURE_DIR, "__unit-out");

  beforeAll(() => mkdirSync(out, { recursive: true }));
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  test("routes static files first, then falls back to /render when a server surface exists", () => {
    writeConfigJson(out, unitManifest());
    const config = JSON.parse(readFileSync(join(out, "config.json"), "utf-8"));
    expect(config.version).toBe(3);
    expect(config.routes[0]).toEqual({ handle: "filesystem" });
    expect(config.routes[1]).toEqual({ src: "/(.*)", dest: "/render" });
  });

  test("emits NO render fallback for a fully static app", () => {
    writeConfigJson(out, unitManifest({ hasServerSurface: false, routes: [] }));
    const config = JSON.parse(readFileSync(join(out, "config.json"), "utf-8"));
    expect(config.routes).toEqual([{ handle: "filesystem" }]);
    expect(config.routes.some((r: { dest?: string }) => r.dest === "/render")).toBe(false);
  });

  test("emits the Vercel images config when remote hosts are allow-listed", () => {
    writeConfigJson(
      out,
      unitManifest({ images: { remoteHosts: ["cdn.example.com"] } }),
    );
    const config = JSON.parse(readFileSync(join(out, "config.json"), "utf-8"));
    expect(config.images.domains).toEqual(["cdn.example.com"]);
    expect(config.images.sizes).toBeDefined();
  });
});

describe("generateEntrySource", () => {
  test("bakes the stylesheetHref into the createApp call (the 2026-07 Vercel regression)", () => {
    const src = generateEntrySource(unitManifest({ stylesheetHref: "/styles.css" }), "/tmp/e");
    expect(src).toContain('stylesheetHref: "/styles.css"');
  });

  test("omits stylesheetHref when the app has no stylesheet", () => {
    const manifest = unitManifest();
    delete manifest.stylesheetHref;
    const src = generateEntrySource(manifest, "/tmp/e");
    expect(src).not.toContain("stylesheetHref");
  });

  test("emits preloaded routes with mode + module references", () => {
    const src = generateEntrySource(unitManifest(), "/tmp/e");
    expect(src).toContain("__x_preloadedRoutes");
    expect(src).toContain('"routePath":"/about"');
    expect(src).toContain('mode: "server"');
    expect(src).toContain("module: route_about");
    // Everything must be statically imported -- dynamic import(path) cannot
    // be traced by the bundler, and the whole point is one self-contained
    // function with no filesystem access.
    expect(src).not.toContain("import(");
  });

  test("registers standalone actions at cold start", () => {
    const manifest = unitManifest({
      actions: [
        {
          parentPath: "/api/subscribe",
          paramNames: [],
          module: {
            sourcePath: "/fixture/actions/subscribe.ts",
            compiledPath: "/fixture/compiled/subscribe.mjs",
            identifier: "action_subscribe",
          },
        },
      ],
    });
    const src = generateEntrySource(manifest, "/tmp/e");
    expect(src).toContain("action_subscribe");
    expect(src).toContain('parentPath = "/api/subscribe"');
    expect(src).toContain("registerServerFunctions");
  });
});

describe("buildVercelOutput (integration)", () => {
  beforeAll(async () => {
    touch(
      PAGES_DIR,
      "index.tsx",
      `export const mode = "static";
export default function Home() {
  return <h1>Home</h1>;
}
`,
    );
    touch(
      PAGES_DIR,
      "about.tsx",
      `export const mode = "server";
export default function About() {
  return <h1>About</h1>;
}
`,
    );
    touch(
      API_DIR,
      "hello.ts",
      `export function GET() {
  return Response.json({ hello: "world" });
}
`,
    );
    touch(PUBLIC_DIR, "styles.css", "body { color: red; }\n");

    await buildVercelOutput({
      projectRoot: FIXTURE_DIR,
      outputDir: OUTPUT_DIR,
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
    });
  });

  afterAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  test("writes config.json with filesystem + render fallback routing", () => {
    const config = JSON.parse(readFileSync(join(OUTPUT_DIR, "config.json"), "utf-8"));
    expect(config.version).toBe(3);
    expect(config.routes).toEqual([
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/render" },
    ]);
  });

  test("ships prerendered static pages in static/", () => {
    expect(existsSync(join(OUTPUT_DIR, "static/index.html"))).toBe(true);
    expect(readFileSync(join(OUTPUT_DIR, "static/index.html"), "utf-8")).toContain(
      "<h1>Home</h1>",
    );
  });

  test("copies public assets (styles.css) into static/", () => {
    const css = readFileSync(join(OUTPUT_DIR, "static/styles.css"), "utf-8");
    expect(css).toContain("body { color: red; }");
  });

  test("produces a render function with .vc-config.json and index.mjs", () => {
    const funcDir = join(OUTPUT_DIR, "functions/render.func");
    expect(existsSync(join(funcDir, "index.mjs"))).toBe(true);
    const vc = JSON.parse(readFileSync(join(funcDir, ".vc-config.json"), "utf-8"));
    expect(vc.runtime).toBe("nodejs20.x");
    expect(vc.handler).toBe("index.mjs");
  });

  test("bakes the stylesheetHref into the bundled render function (regression)", () => {
    const bundle = readFileSync(
      join(OUTPUT_DIR, "functions/render.func/index.mjs"),
      "utf-8",
    );
    expect(bundle).toContain('stylesheetHref: "/styles.css"');
  });

  test("bundles every server-mode route into the render function", () => {
    const bundle = readFileSync(
      join(OUTPUT_DIR, "functions/render.func/index.mjs"),
      "utf-8",
    );
    expect(bundle).toContain('"/about"');
  });
});
