import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "./createApp";
import { createInMemoryMetrics } from "./observability/metrics";
import { setErrorReporter } from "./observability/monitoring";

/**
 * The client reports hydration mismatches via a POST beacon to
 * `/__x/hydration-mismatch` (#95). These tests pin the endpoint's contract:
 * it records the mismatch with the error reporter and a dedicated metric, and
 * refuses obviously cross-site/oversized/truncated payloads so a random site
 * can't spam telemetry.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/hydration");
const PAGES_DIR = join(FIXTURE_DIR, "pages");
const API_DIR = join(FIXTURE_DIR, "api");

function touch(relPath: string, content: string) {
  const full = join(FIXTURE_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

let captured: { error: unknown; context: unknown }[] = [];

beforeAll(() => {
  touch("pages/index.tsx", `export default function Home() { return <h1>Home</h1>; }\n`);
  touch("api/hello.ts", `export function GET() { return Response.json({ ok: true }); }\n`);
  setErrorReporter({
    captureException(error, context) {
      captured.push({ error, context });
    },
  });
});

afterAll(() => {
  setErrorReporter({ captureException: () => {} });
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

const ENDPOINT = "http://localhost/__x/hydration-mismatch";

describe("hydration mismatch endpoint", () => {
  test("records a same-origin mismatch with the error reporter and a metric", async () => {
    const metrics = createInMemoryMetrics();
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false, metrics },
    });
    captured = [];

    const res = await a.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({
          error: "text did not match server-rendered HTML",
          island: "Counter",
          url: "http://localhost/about",
        }),
      }),
    );
    expect(res.status).toBe(204);

    expect(captured.length).toBe(1);
    expect(captured[0]).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "text did not match server-rendered HTML",
        }),
        context: expect.objectContaining({
          phase: "ssr",
          route: "/about",
          tag: "hydration-mismatch",
        }),
      }),
    );

    const snap = metrics.snapshot();
    const mismatches = snap.counters.find((c) => c.name === "x_http_hydration_mismatch");
    expect(mismatches?.value).toBe(1);
    expect(mismatches?.labels.island).toBe("Counter");
  });

  test("records a mismatch when the request omits an origin", async () => {
    const metrics = createInMemoryMetrics();
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false, metrics },
    });
    captured = [];

    const res = await a.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ error: "boom", island: "Nav" }),
      }),
    );
    expect(res.status).toBe(204);
    expect(captured.length).toBe(1);
  });

  test("rejects a cross-site beacon", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });

    const res = await a.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: JSON.stringify({ error: "spam", island: "Whatever" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  test("rejects an oversized beacon body", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });
    const res = await a.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        body: `{"error":"${"x".repeat(3000)}"}`,
      }),
    );
    expect(res.status).toBe(413);
  });

  test("rejects malformed JSON", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });
    const res = await a.fetch(new Request(ENDPOINT, { method: "POST", body: "not json" }));
    expect(res.status).toBe(400);
  });

  test("rejects non-POST requests", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });
    const res = await a.fetch(new Request(ENDPOINT));
    expect(res.status).toBe(405);
  });
});
