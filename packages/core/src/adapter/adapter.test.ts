import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bundleRenderFunction } from "./bundle";
import { generateAdapterEntry } from "./generate-entry";
import { resolveBuildManifest } from "./scan";
import type { BuildManifest } from "./types";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/adapter-sdk");

function touch(dir: string, relPath: string, content: string) {
  const full = join(dir, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

describe("adapter SDK", () => {
  beforeAll(() => {
    touch(
      FIXTURE_DIR,
      "src/pages/index.tsx",
      `export const mode = "static";
export default function Home() {
  return <h1>SDK home</h1>;
}
`,
    );
    touch(
      FIXTURE_DIR,
      "src/pages/about.tsx",
      `export default function About() {
  return <h1>SDK about</h1>;
}
`,
    );
    touch(
      FIXTURE_DIR,
      "src/api/hello.ts",
      `export function GET() {
  return Response.json({ hello: "world" });
}
`,
    );
    touch(FIXTURE_DIR, "public/styles.css", "body {}\n");
  });

  afterAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  test("resolveBuildManifest scans server-mode routes and API routes at build time", async () => {
    const scratch = join(FIXTURE_DIR, ".resolve");
    const manifest = await resolveBuildManifest(
      {
        projectRoot: FIXTURE_DIR,
        pagesDir: join(FIXTURE_DIR, "src/pages"),
        apiDir: join(FIXTURE_DIR, "src/api"),
      },
      scratch,
    );
    expect(manifest.hasServerSurface).toBe(true);
    const paths = manifest.routes.map((r) => r.routePath);
    expect(paths).toContain("/about");
    expect(paths).toContain("/api/hello");
    const about = manifest.routes.find((r) => r.routePath === "/about");
    expect(about?.mode).toBe("server");
    expect(about?.route.sourcePath.endsWith("about.tsx")).toBe(true);
    // Static mode pages are excluded -- the core build prerenders them.
    expect(paths.some((p) => p === "/")).toBe(false);
    expect(manifest.stylesheetHref).toBe("/styles.css");
  });

  test("generateAdapterEntry emits a statically-imported, createApp-booting entry", async () => {
    const manifest: BuildManifest = {
      projectRoot: "/s",
      pagesDirLabel: "src/pages",
      routes: [
        {
          routePath: "/about",
          paramNames: [],
          isApi: false,
          mode: "server",
          route: {
            sourcePath: "/s/about.tsx",
            compiledPath: "/s/__x_page_1.mjs",
            identifier: "__x_page_1",
          },
          layoutChain: [],
          middlewareChain: [],
        },
      ],
      actions: [],
      hasServerSurface: true,
      stylesheetHref: "/styles.css",
    };
    const src = generateAdapterEntry(manifest, "/tmp/e");
    expect(src).toContain('import { createApp, registerServerFunctions } from "@thexjs/core";');
    expect(src).toContain("__x_preloadedRoutes");
    expect(src).toContain('stylesheetHref: "/styles.css"');
    expect(src).toContain("module: __x_page_1");
    expect(src).not.toContain("import(");
    expect(src).toContain("export { __x_app };");
    // Build-machine absolute paths must not leak into the generated entry.
    expect(src).not.toContain('"/s/about.tsx"');
    expect(src).not.toContain('filePath: "/s/about.tsx"');
  });

  test("generateAdapterEntry relativizes emitted paths against the project root", () => {
    const manifest: BuildManifest = {
      projectRoot: "/s",
      pagesDirLabel: "/s/src/pages",
      routes: [
        {
          routePath: "/about",
          paramNames: [],
          isApi: false,
          mode: "server",
          route: {
            sourcePath: "/s/src/pages/about.tsx",
            compiledPath: "/s/.scratch/__x_page_1.mjs",
            identifier: "__x_page_1",
          },
          layoutChain: [],
          middlewareChain: [],
        },
      ],
      actions: [],
      hasServerSurface: true,
    };
    const src = generateAdapterEntry(manifest, "/tmp/e");
    expect(src).toContain('"filePath":"./src/pages/about.tsx"');
    expect(src).not.toContain('"/s/');
    expect(src).toContain('pagesDir: "./src/pages"');
  });

  test("generateAdapterEntry rejects non-JSON-serializable runtime options", () => {
    const manifest: BuildManifest = {
      projectRoot: "/s",
      pagesDirLabel: "src/pages",
      routes: [],
      actions: [],
      hasServerSurface: true,
      security: { errorReporter: () => {} },
    };
    expect(() => generateAdapterEntry(manifest, "/tmp/e")).toThrow(
      /cannot serialize security\.errorReporter/,
    );
  });

  test("bundleRenderFunction emits a standalone index.mjs", async () => {
    const fnDir = join(FIXTURE_DIR, ".bundle");
    const src = `const __x_app = { fetch: async () => new Response("ok") };\nexport default __x_app;\nconsole.log("bundle probe");`;
    await bundleRenderFunction(fnDir, src);
    expect(existsSync(join(fnDir, "index.mjs"))).toBe(true);
    expect(readFileSync(join(fnDir, "index.mjs"), "utf-8")).toContain("__x_app");
    const mod = (await import(`${fnDir}/index.mjs`)) as {
      default?: { fetch(req: Request): Promise<Response> };
    };
    const res = await mod.default?.fetch(new Request("http://localhost/probe"));
    expect(await res?.text()).toBe("ok");
    rmSync(fnDir, { recursive: true, force: true });
  });

  test("action modules using a batched `actions` export expose per-function fnNames", async () => {
    const dir = join(FIXTURE_DIR, "batched-actions");
    // The batched pattern exports only `actions` — no individual named exports
    // from the module itself. Naively taking `Object.keys(module)` would yield
    // `["actions"]` instead of the functions inside.
    touch(
      dir,
      "src/actions/subscribe.ts",
      `function greet(name: string): Promise<string> {
  return Promise.resolve("hi " + name);
}
function farewell(name: string): Promise<string> {
  return Promise.resolve("bye " + name);
}
export const actions = { greet, farewell };
`,
    );

    const scratch = join(dir, ".resolve");
    const manifest = await resolveBuildManifest(
      {
        projectRoot: dir,
        pagesDir: join(dir, "src/pages"),
        actionsDir: join(dir, "src/actions"),
      },
      scratch,
    );

    expect(manifest.hasServerSurface).toBe(true);
    expect(manifest.actions).toHaveLength(1);
    expect(manifest.actions[0]?.parentPath).toBe("/");
    // The client stub is generated from fnNames, so this must enumerate the
    // batched functions — not the single `actions` export key.
    expect(manifest.actions[0]?.fnNames).toEqual(["greet", "farewell"]);

    rmSync(dir, { recursive: true, force: true });
  });
});
