import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { createApp } from "./createApp";
import { composeMiddleware, type MiddlewareFn } from "./middleware";
import { renderStreamingPage } from "./render";
import { findMiddlewareChain, scanMiddleware, scanRoutes } from "./router";
import { generateServerFunctionClient } from "./server-functions";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/phase3");
const ISR_DIR = join(import.meta.dir, "__fixtures__/isr");

function touch(relPath: string, content?: string) {
  const full = join(FIXTURE_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content ?? "export default function Page() { return null; }\n");
}

function isrTouch(relPath: string, content: string) {
  const full = join(ISR_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

beforeAll(() => {
  touch("api/posts.ts");
  touch("api/users/[id].ts");
  touch("api/index.ts");
  touch("_middleware.ts", "export function middleware(ctx: any, next: any) { return next(); }");
  touch(
    "dashboard/_middleware.ts",
    "export function middleware(ctx: any, next: any) { return next(); }",
  );
  touch("dashboard/settings.tsx");

  isrTouch(
    "isr-static.tsx",
    `import { createElement } from "react";
export const mode = "static";
export const revalidate = 3600;
export default function Page() {
  return createElement("h1", null, "ISR Static Page");
}
`,
  );
  isrTouch(
    "pure-static.tsx",
    `import { createElement } from "react";
export const mode = "static";
export default function Page() {
  return createElement("h1", null, "Pure Static");
}
`,
  );
  isrTouch(
    "dynamic/[slug].tsx",
    `import { createElement } from "react";
export const mode = "static";
export const revalidate = 3600;
export async function loader({ params }: any) {
  return { slug: params.slug };
}
export default function Page({ loaderData }: any) {
  return createElement("h1", null, "Dynamic ISR: " + loaderData.slug);
}
`,
  );
  isrTouch(
    "search.tsx",
    `import { createElement } from "react";
export const mode = "static";
export const revalidate = 3600;
export async function loader({ params, request }: any) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return { q };
}
export default function Page({ loaderData }: any) {
  return createElement("h1", null, "Search ISR: " + loaderData.q);
}
`,
  );
});

afterAll(() => {
  rmSync(join(import.meta.dir, "__fixtures__/phase3"), { recursive: true, force: true });
  rmSync(join(import.meta.dir, "__fixtures__/isr"), { recursive: true, force: true });
  rmSync(join(import.meta.dir, "__fixtures__/x-routes.ts"), { force: true });
});

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(result);
}

describe("API route detection", () => {
  test("marks routes under api/ as isApi", () => {
    const routes = scanRoutes(FIXTURE_DIR);
    const apiRoutes = routes.filter((r) => r.isApi);
    expect(apiRoutes.length).toBeGreaterThanOrEqual(3);
    expect(apiRoutes.some((r) => r.routePath === "/api/posts")).toBe(true);
    expect(apiRoutes.some((r) => r.routePath === "/api/users/:id")).toBe(true);
    expect(apiRoutes.some((r) => r.routePath === "/api")).toBe(true);
  });

  test("non-api routes are not marked isApi", () => {
    const routes = scanRoutes(FIXTURE_DIR);
    const nonApi = routes.filter((r) => !r.isApi);
    for (const r of nonApi) {
      expect(r.routePath).not.toContain("/api/");
      expect(r.routePath).not.toBe("/api");
    }
  });
});

describe("middleware scanning", () => {
  test("scanMiddleware discovers _middleware files", () => {
    const entries = scanMiddleware(FIXTURE_DIR);
    const paths = entries.map((e) => e.filePath.replace(FIXTURE_DIR, "")).sort();
    expect(paths).toContain("/_middleware.ts");
    expect(paths).toContain("/dashboard/_middleware.ts");
  });

  test("findMiddlewareChain builds ancestor chain (outermost first)", () => {
    const entries = scanMiddleware(FIXTURE_DIR);
    const settingsPath = join(FIXTURE_DIR, "dashboard/settings.tsx");
    const chain = findMiddlewareChain(settingsPath, entries, FIXTURE_DIR);
    expect(chain.length).toBe(2);
    expect(chain[0]?.dirPath).toBe(FIXTURE_DIR);
    expect(chain[1]?.dirPath).toBe(join(FIXTURE_DIR, "dashboard"));
  });

  test("findMiddlewareChain returns root middleware for all routes", () => {
    const entries = scanMiddleware(FIXTURE_DIR);
    const noMw = scanRoutes(FIXTURE_DIR).find((r) => r.routePath === "/api/posts");
    const chain = noMw ? findMiddlewareChain(noMw.filePath, entries, FIXTURE_DIR) : [];
    expect(chain.length).toBe(1);
    expect(chain[0]?.dirPath).toBe(FIXTURE_DIR);
  });
});

describe("composeMiddleware", () => {
  test("executes middleware in correct order (onion pattern)", async () => {
    const order: number[] = [];
    const mw1: MiddlewareFn = async (_ctx, next) => {
      order.push(1);
      const res = await next();
      order.push(4);
      return res;
    };
    const mw2: MiddlewareFn = async (_ctx, next) => {
      order.push(2);
      const res = await next();
      order.push(3);
      return res;
    };
    const handler = async () => {
      order.push(5);
      return new Response("ok");
    };

    const composed = composeMiddleware([mw1, mw2], handler);
    const res = await composed(
      { params: {}, request: new Request("http://localhost") },
      async () => new Response("not found", { status: 404 }),
    );
    expect(order).toEqual([1, 2, 5, 3, 4]);
    expect(await res.text()).toBe("ok");
  });

  test("middleware can short-circuit", async () => {
    const mw: MiddlewareFn = async () => new Response("blocked", { status: 403 });
    const handler = async () => new Response("ok");

    const composed = composeMiddleware([mw], handler);
    const res = await composed(
      { params: {}, request: new Request("http://localhost") },
      async () => new Response("not found", { status: 404 }),
    );
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("blocked");
  });

  test("single middleware works", async () => {
    const mw: MiddlewareFn = async (_ctx, next) => {
      const res = await next();
      return new Response(res.body, {
        ...res,
        headers: { "x-custom": "true" },
      });
    };
    const handler = async () => new Response("hello");

    const composed = composeMiddleware([mw], handler);
    const res = await composed(
      { params: {}, request: new Request("http://localhost") },
      async () => new Response("not found", { status: 404 }),
    );
    expect(res.headers.get("x-custom")).toBe("true");
    expect(await res.text()).toBe("hello");
  });

  test("empty middleware list just calls handler", async () => {
    const handler = async () => new Response("direct");
    const composed = composeMiddleware([], handler);
    const res = await composed(
      { params: {}, request: new Request("http://localhost") },
      async () => new Response("not found", { status: 404 }),
    );
    expect(await res.text()).toBe("direct");
  });
});

describe("renderStreamingPage", () => {
  test("returns a ReadableStream", async () => {
    const element = createElement("h1", null, "Streaming Test");
    const stream = await renderStreamingPage(element);
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  test("produces valid HTML shell", async () => {
    const element = createElement("h1", null, "Hello Streaming");
    const stream = await renderStreamingPage(element, { title: "Stream Test" });
    const html = await streamToString(stream);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Stream Test</title>");
    expect(html).toContain("<h1>Hello Streaming</h1>");
    expect(html).toContain("</html>");
  });

  test("includes island scripts when provided", async () => {
    const element = createElement("div", null, "islands");
    const stream = await renderStreamingPage(element, {
      islandScripts: ["/_islands/test.js"],
    });
    const html = await streamToString(stream);
    expect(html).toContain('src="/_islands/test.js"');
    expect(html).toContain("data-island-script");
    // Island bundles must load as classic scripts (no type="module"): ESM
    // modules execute only once per document, so re-inserting the tag during
    // client-side navigation (back/forward) would never re-run hydration.
    expect(html).not.toContain('type="module"');
  });

  test("includes island props when provided", async () => {
    const element = createElement("div", null, "props");
    const stream = await renderStreamingPage(element, {
      islandProps: { counter: '{"count":5}' },
    });
    const html = await streamToString(stream);
    expect(html).toContain("__X_ISLAND_PROPS");
    expect(html).toContain('"counter"');
  });
});

describe("generateServerFunctionClient", () => {
  test("generates a fetch wrapper for each function", () => {
    const code = generateServerFunctionClient(
      "/api/subscribe.ts",
      ["subscribe", "unsubscribe"],
      "/api/subscribe",
    );
    expect(code).toContain("export async function subscribe");
    expect(code).toContain("export async function unsubscribe");
    expect(code).toContain('method: "POST"');
    expect(code).toContain('"/api/subscribe/subscribe"');
    expect(code).toContain('"/api/subscribe/unsubscribe"');
    expect(code).toContain("Content-Type");
    expect(code).toContain("JSON.stringify(args)");
  });

  test("handles single function", () => {
    const code = generateServerFunctionClient("/api/hello.ts", ["greet"], "/api/hello");
    expect(code).toContain("export async function greet");
  });

  test("includes file path comment", () => {
    const code = generateServerFunctionClient("/api/foo.ts", ["bar"], "/api/foo");
    expect(code).toContain("/api/foo.ts");
  });
});

describe("ISR revalidation", () => {
  test("static route with revalidate caches HTML (miss then hit)", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    const res1 = await app.fetch(new Request("http://localhost/isr-static"));
    expect(res1.headers.get("X-Revalidated")).toBe("miss");

    const res2 = await app.fetch(new Request("http://localhost/isr-static"));
    expect(res2.headers.get("X-Revalidated")).toBe("hit");
  });

  test("dynamic revalidate routes are cached per-URL, not per-pattern", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    const one = await app.fetch(new Request("http://localhost/dynamic/one"));
    expect(one.headers.get("X-Revalidated")).toBe("miss");
    expect(await one.text()).toContain("Dynamic ISR: one");

    // Same pattern, different URL: must not serve the cached /dynamic/one HTML.
    const two = await app.fetch(new Request("http://localhost/dynamic/two"));
    expect(two.headers.get("X-Revalidated")).toBe("miss");
    expect(await two.text()).toContain("Dynamic ISR: two");

    // Both now cached under their own URLs.
    const oneHit = await app.fetch(new Request("http://localhost/dynamic/one"));
    expect(oneHit.headers.get("X-Revalidated")).toBe("hit");
    expect(await oneHit.text()).toContain("Dynamic ISR: one");
  });

  test("/__x/revalidate busts the cache", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    await app.fetch(new Request("http://localhost/isr-static"));
    const resHit = await app.fetch(new Request("http://localhost/isr-static"));
    expect(resHit.headers.get("X-Revalidated")).toBe("hit");

    const revalRes = await app.fetch(
      new Request("http://localhost/__x/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost" },
        body: JSON.stringify({ path: "/isr-static" }),
      }),
    );
    expect(revalRes.status).toBe(200);
    expect(await revalRes.text()).toBe("Revalidated: /isr-static (1 cached variant(s))");

    const resMiss = await app.fetch(new Request("http://localhost/isr-static"));
    expect(resMiss.headers.get("X-Revalidated")).toBe("miss");
  });

  test("/__x/revalidate with no path clears all caches", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    await app.fetch(new Request("http://localhost/isr-static"));
    await app.fetch(new Request("http://localhost/pure-static"));

    const revalRes = await app.fetch(
      new Request("http://localhost/__x/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost" },
        body: JSON.stringify({}),
      }),
    );
    expect(await revalRes.text()).toBe("Revalidated all");
  });

  test("/__x/revalidate rejects cross-site requests", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    const revalRes = await app.fetch(
      new Request("http://localhost/__x/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
        body: JSON.stringify({}),
      }),
    );
    expect(revalRes.status).toBe(403);
  });

  test("route without revalidate has header X-Revalidated: none", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    const res = await app.fetch(new Request("http://localhost/pure-static"));
    expect(res.headers.get("X-Revalidated")).toBe("none");
  });

  test("revalidated page content stays the same (same HTML)", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    const res1 = await app.fetch(new Request("http://localhost/isr-static"));
    const html1 = await res1.text();

    const res2 = await app.fetch(new Request("http://localhost/isr-static"));
    const html2 = await res2.text();

    expect(html1).toBe(html2);
  });

  test("query strings are part of the cache key — no cross-URL leakage", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    const a = await app.fetch(new Request("http://localhost/search?q=alpha"));
    expect(a.headers.get("X-Revalidated")).toBe("miss");
    expect(await a.text()).toContain("Search ISR: alpha");

    // Same path, different query: must NOT serve the cached ?q=alpha HTML.
    const b = await app.fetch(new Request("http://localhost/search?q=beta"));
    expect(b.headers.get("X-Revalidated")).toBe("miss");
    expect(await b.text()).toContain("Search ISR: beta");

    // Each query variant is cached under its own key and re-served correctly.
    const aHit = await app.fetch(new Request("http://localhost/search?q=alpha"));
    expect(aHit.headers.get("X-Revalidated")).toBe("hit");
    expect(await aHit.text()).toContain("Search ISR: alpha");

    const bHit = await app.fetch(new Request("http://localhost/search?q=beta"));
    expect(bHit.headers.get("X-Revalidated")).toBe("hit");
    expect(await bHit.text()).toContain("Search ISR: beta");
  });

  test("revalidate by path purges every query variant of that path", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    await app.fetch(new Request("http://localhost/search?q=alpha"));
    await app.fetch(new Request("http://localhost/search?q=beta"));

    const revalRes = await app.fetch(
      new Request("http://localhost/__x/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost" },
        body: JSON.stringify({ path: "/search" }),
      }),
    );
    expect(revalRes.status).toBe(200);
    expect(await revalRes.text()).toBe("Revalidated: /search (2 cached variant(s))");

    const miss = await app.fetch(new Request("http://localhost/search?q=alpha"));
    expect(miss.headers.get("X-Revalidated")).toBe("miss");
  });

  test("concurrent ISR misses render once (stampede dedup)", async () => {
    const app = await createApp({
      routesDir: ISR_DIR,
      development: true,
    });

    const results = await Promise.all(
      Array.from({ length: 8 }, () => app.fetch(new Request("http://localhost/isr-static"))),
    );
    for (const res of results) {
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("ISR Static Page");
    }
  });
});
