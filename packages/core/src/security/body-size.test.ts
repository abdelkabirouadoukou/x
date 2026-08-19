import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "../createApp";
import {
  DEFAULT_MAX_BODY_SIZE,
  enforceRequestBodySize,
  RequestBodyTooLargeError,
} from "./body-size";

/**
 * Regression tests for the request body size limit (#109).
 *
 * Before this file existed, `createApp` buffered whatever a route, server
 * function, or API handler asked for (`req.json()` / `req.text()` /
 * `req.formData()`) with no byte budget, so a single oversized POST could
 * drive the process toward OOM. These tests pin the two enforcement halves:
 * an up-front `Content-Length` rejection (413) and a streaming abort for
 * chunked requests that have no `Content-Length`.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/body-size");
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
    "api/echo.ts",
    `export async function POST(req: Request) {
  const body = await req.json();
  return Response.json(body);
}
`,
  );
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

function app(maxBodySize?: number) {
  return createApp({
    pagesDir: PAGES_DIR,
    apiDir: API_DIR,
    development: false,
    security: { headers: false },
    observability: { logging: false },
    ...(maxBodySize === undefined ? {} : { maxBodySize }),
  });
}

describe("enforceRequestBodySize", () => {
  test("rejects a request whose Content-Length exceeds the limit with 413", () => {
    const result = enforceRequestBodySize(
      new Request("http://localhost/api/echo", {
        method: "POST",
        headers: { "content-length": "2048" },
        body: "{}",
      }),
      1024,
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(413);
  });

  test("passes a GET/HEAD request through untouched", () => {
    const req = new Request("http://localhost/about");
    expect(enforceRequestBodySize(req, DEFAULT_MAX_BODY_SIZE)).toBe(req);
  });

  test("passes a request whose Content-Length is within the limit through untouched", () => {
    const req = new Request("http://localhost/api/echo", {
      method: "POST",
      headers: { "content-length": "2" },
      body: "{}",
    });
    expect(enforceRequestBodySize(req, 1024)).toBe(req);
  });

  test("wrapped chunked body rejects with RequestBodyTooLargeError when read past the limit", async () => {
    let pulled = 0;
    const source = new ReadableStream({
      pull(controller) {
        pulled++;
        if (pulled > 100) {
          controller.close();
          return;
        }
        controller.enqueue(new TextEncoder().encode("x".repeat(64)));
      },
    });
    const guarded = enforceRequestBodySize(
      new Request("http://localhost/api/echo", { method: "POST", body: source }),
      10,
    );
    expect(guarded).not.toBeInstanceOf(Response);
    const req = guarded as Request;
    await expect(req.json()).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    // The counter must stop pulling the source almost immediately — not read
    // the entire (unbounded) body into memory before noticing the limit.
    expect(pulled).toBeLessThan(10);
  });
});

describe("createApp body size limit", () => {
  test("request under the limit passes through the full pipeline", async () => {
    const a = await app();
    const res = await a.fetch(
      new Request("http://localhost/api/echo", {
        method: "POST",
        headers: { "content-length": "2" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });

  test("request over the limit via Content-Length returns 413", async () => {
    const a = await app(10);
    const res = await a.fetch(
      new Request("http://localhost/api/echo", {
        method: "POST",
        headers: { "content-length": "2048" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(413);
    expect(await res.text()).toBe("Payload too large");
  });

  test("request over the limit via chunked transfer aborts before fully buffering", async () => {
    let pulled = 0;
    const source = new ReadableStream({
      pull(controller) {
        pulled++;
        if (pulled > 100) {
          controller.close();
          return;
        }
        controller.enqueue(new TextEncoder().encode("x".repeat(64)));
      },
    });
    const a = await app(10);
    const res = await a.fetch(
      new Request("http://localhost/api/echo", { method: "POST", body: source }),
    );
    expect(res.status).toBe(413);
    expect(pulled).toBeLessThan(10);
  });
});
