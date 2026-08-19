import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "./createApp";
import { setErrorReporter } from "./observability/monitoring";

/**
 * Regression tests for the global error boundary on the request path (#92).
 * A thrown error in any route (page loader, API handler, revalidation body)
 * must surface as a clean 500 — never crash the process, never hang.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/errors");
const PAGES_DIR = join(FIXTURE_DIR, "pages");
const API_DIR = join(FIXTURE_DIR, "api");

function touch(relPath: string, content: string) {
  const full = join(FIXTURE_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

let captured: { error: unknown; context: unknown }[] = [];

beforeAll(() => {
  touch(
    "pages/index.tsx",
    `export const mode = "server";
export default function Home() {
  return <h1>Home</h1>;
}
`,
  );
  touch(
    "pages/boom.tsx",
    `export const mode = "server";
export async function loader() {
  throw new Error("loader exploded");
}
export default function Boom() {
  return <h1>Boom</h1>;
}
`,
  );
  touch(
    "api/boom.ts",
    `export function GET() {
  throw new Error("api exploded");
}
`,
  );
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

describe("global error boundary", () => {
  test("a throwing page loader returns 500, not a downed process", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });
    captured = [];

    const res = await a.fetch(new Request("http://localhost/boom"));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain("Internal Server Error");

    expect(captured.length).toBe(1);
    expect(captured[0]).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ message: "loader exploded" }),
        context: expect.objectContaining({ phase: "loader", route: "/boom" }),
      }),
    );
  });

  test("a throwing API handler returns 500", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });
    captured = [];

    const res = await a.fetch(new Request("http://localhost/api/boom"));
    expect(res.status).toBe(500);
    expect(await res.text()).toMatch(/Internal server error/i);

    expect(captured.length).toBe(1);
    expect(captured[0]).toEqual(
      expect.objectContaining({
        context: expect.objectContaining({ phase: "api", route: "/api/boom" }),
      }),
    );
  });

  test("server still serves healthy routes after an error", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });

    expect((await a.fetch(new Request("http://localhost/boom"))).status).toBe(500);
    const res = await a.fetch(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<h1>Home</h1>");
  });

  test("dev mode includes the error message in the 500 body", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: true,
      security: { headers: false },
      observability: { logging: false },
    });

    const res = await a.fetch(new Request("http://localhost/boom"));
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("loader exploded");
  });

  test("a malformed revalidation JSON body returns 400, not a crash", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });

    const res = await a.fetch(
      new Request("http://localhost/__x/revalidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Revalidation is same-origin-only; pass a matching Origin so the
          // request gets past CSRF and actually reaches the JSON body parse.
          Origin: "http://localhost",
        },
        body: "not json {",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Invalid JSON body");
  });
});
