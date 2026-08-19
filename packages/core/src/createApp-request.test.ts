import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "./createApp";
import { createInMemoryMetrics } from "./observability/metrics";

/**
 * Integration tests for the full request pipeline exposed by
 * `createApp().fetch` -- the same code path `x dev` and `x start` hand every
 * incoming request. The routing unit tests in router.test.ts cover path
 * matching in isolation; these cover what actually happens to a real Request:
 * page SSR, dynamic params, API method dispatch, 404s, security headers,
 * rate limiting, health checks, and the stylesheet link.
 *
 * Before this file existed, none of this was exercised: a route that matched
 * but rendered the wrong component, or an API route that never dispatched its
 * handler, would only surface at deploy time.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/request");
const PAGES_DIR = join(FIXTURE_DIR, "pages");
const API_DIR = join(FIXTURE_DIR, "api");

function touch(relPath: string, content: string) {
  const full = join(FIXTURE_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

beforeAll(() => {
  touch(
    "pages/index.tsx",
    `export const mode = "static";
export default function Home() {
  return <h1>Home</h1>;
}
`,
  );
  touch(
    "pages/about.tsx",
    `export const mode = "server";
export default function About() {
  return <h1>About</h1>;
}
`,
  );
  touch(
    "pages/blog/[slug].tsx",
    `export const mode = "server";
export default function Post({ params }: { params: Record<string, string> }) {
  return <h1>Post: {params.slug}</h1>;
}
`,
  );
  touch(
    "api/hello.ts",
    `export function GET() {
  return Response.json({ hello: "world" });
}
export function POST() {
  return new Response("posted", { status: 201 });
}
`,
  );
  touch(
    "api/users/[id].ts",
    `export function GET(req: Request) {
  const id = new URL(req.url).pathname.split("/").pop();
  return Response.json({ id });
}
`,
  );
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

async function app() {
  return createApp({
    pagesDir: PAGES_DIR,
    apiDir: API_DIR,
    development: false,
    security: { headers: false },
    observability: { logging: false },
  });
}

describe("page routing", () => {
  test("serves a server-mode page with SSR HTML", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/about"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("<h1>About</h1>");
  });

  test("serves a static-mode page", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<h1>Home</h1>");
  });

  test("passes dynamic segment params to the page component", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/blog/hello-world"));
    expect(res.status).toBe(200);
    // React inserts HTML comment markers between text nodes, so assert the
    // rendered <h1> contains the param rather than exact text.
    expect(await res.text()).toMatch(/<h1>Post:.*hello-world<\/h1>/);
  });

  test("does not match a multi-segment URL to a single-segment param route", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/blog/a/b"));
    expect(res.status).toBe(404);
  });

  test("returns the default 404 page for unknown routes", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/does-not-exist"));
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });
});

describe("api routes", () => {
  test("dispatches GET to the exported handler and serializes JSON", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/api/hello"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: "world" });
  });

  test("dispatches POST to the exported handler", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/api/hello", { method: "POST" }));
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("posted");
  });

  test("returns 405 for a method with no exported handler", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/api/hello", { method: "DELETE" }));
    expect(res.status).toBe(405);
    expect(await res.text()).toBe("Method DELETE not allowed");
  });

  test("passes dynamic segments through to API handlers", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/api/users/42"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "42" });
  });

  test("GET-only API route rejects POST with 405", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/api/users/42", { method: "POST" }));
    expect(res.status).toBe(405);
  });
});

describe("security hardening", () => {
  test("applies security headers by default", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      observability: { logging: false },
    });
    const res = await a.fetch(new Request("http://localhost/about"));
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.has("Content-Security-Policy")).toBe(true);
    expect(res.headers.has("Strict-Transport-Security")).toBe(true);
  });

  test("security.headers false disables hardening", async () => {
    const a = await app();
    const res = await a.fetch(new Request("http://localhost/about"));
    expect(res.headers.get("X-Frame-Options")).toBeNull();
    expect(res.headers.get("X-Content-Type-Options")).toBeNull();
  });

  test("default CSP uses a per-response nonce, not script-src 'unsafe-inline'", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      observability: { logging: false },
    });
    const res = await a.fetch(new Request("http://localhost/about"));
    const csp = res.headers.get("Content-Security-Policy");
    const scriptSrc = /script-src ([^;]+)/.exec(csp ?? "")?.[1];
    expect(scriptSrc?.includes("'unsafe-inline'")).toBe(false);
    expect(scriptSrc).toContain("'nonce-");
    // The nonce must never leak to the client via the stripped header.
    expect(res.headers.has("x-csp-nonce")).toBe(false);

    const html = await res.text();
    const nonce = /nonce="([^"]+)"/.exec(html)?.[1];
    expect(nonce).toBeDefined();
    expect(scriptSrc).toBe(`'self' 'nonce-${nonce}'`);
  });

  test("non-HTML responses keep the legacy default CSP (nothing inline to protect)", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      observability: { logging: false },
    });
    const res = await a.fetch(new Request("http://localhost/api/hello"));
    const scriptSrc = /script-src ([^;]+)/.exec(
      res.headers.get("Content-Security-Policy") ?? "",
    )?.[1];
    expect(scriptSrc).toBe("'self' 'unsafe-inline'");
  });

  test("rate limiting blocks requests past the configured limit", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: {
        headers: false,
        rateLimit: { limit: 2, windowMs: 60_000, keyFn: () => "test-key" },
      },
      observability: { logging: false },
    });
    const mk = () => new Request("http://localhost/about");
    expect((await a.fetch(mk())).status).toBe(200);
    expect((await a.fetch(mk())).status).toBe(200);
    expect((await a.fetch(mk())).status).toBe(429);
  });
});

describe("observability", () => {
  test("serves /healthz when health checks are enabled", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false, health: {} },
    });
    const res = await a.fetch(new Request("http://localhost/healthz"));
    expect(res.status).toBe(200);
  });

  test("records request metrics and serves /metrics in Prometheus format", async () => {
    const metrics = createInMemoryMetrics();
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false, metrics },
    });

    const pageRes = await a.fetch(new Request("http://localhost/about"));
    expect(pageRes.status).toBe(200);

    const metricsRes = await a.fetch(new Request("http://localhost/metrics"));
    expect(metricsRes.status).toBe(200);
    const text = await metricsRes.text();
    expect(text).toContain("# TYPE x_http_requests_total counter");
    expect(text).toContain('x_http_requests_total{method="GET",status="200"} 1');
    expect(text).toContain("# TYPE x_http_request_duration_ms histogram");
    expect(text).toContain('x_http_request_duration_ms_sum{method="GET"}');
  });

  test("does not serve /metrics when no metrics reporter is configured", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });
    const res = await a.fetch(new Request("http://localhost/metrics"));
    expect(res.status).toBe(404);
  });

  test("records rate-limit rejections as a metric", async () => {
    const metrics = createInMemoryMetrics();
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: {
        headers: false,
        rateLimit: { limit: 1, windowMs: 60_000 },
      },
      observability: { logging: false, metrics },
    });
    const mk = () => new Request("http://localhost/about");
    expect((await a.fetch(mk())).status).toBe(200);
    expect((await a.fetch(mk())).status).toBe(429);

    const snap = metrics.snapshot();
    const rejected = snap.counters.find((c) => c.name === "x_rate_limit_rejections_total");
    expect(rejected?.value).toBe(1);
    expect(rejected?.labels.method).toBe("GET");
  });
});

describe("stylesheet", () => {
  test("emits a stylesheet <link> when stylesheetHref is provided", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      stylesheetHref: "/styles.css",
      security: { headers: false },
      observability: { logging: false },
    });
    const res = await a.fetch(new Request("http://localhost/about"));
    const html = await res.text();
    expect(html).toContain('<link rel="stylesheet" href="/styles.css"');
  });
});
