import { afterEach, describe, expect, test } from "bun:test";
import { createImageProxyHandler } from "./proxy";

/**
 * The /_x/image proxy is a security boundary (SSRF guard): the whole point
 * is that only allow-listed hosts are ever fetched. These tests pin the
 * allow-list behavior and the passthrough/caching contract.
 */

const REAL_FETCH = globalThis.fetch;

function mockFetch(fn: (url: string, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = fn as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = REAL_FETCH;
});

function req(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

describe("routing and input validation", () => {
  test("returns null for non-/_x/image paths", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/favicon.ico"));
    expect(res).toBeNull();
  });

  test("returns null for non-GET methods", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(
      req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png", { method: "POST" }),
    );
    expect(res).toBeNull();
  });

  test("returns 400 when the url param is missing", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image"));
    expect(res?.status).toBe(400);
  });

  test("returns 400 when the url param is not a valid URL", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=not-a-url"));
    expect(res?.status).toBe(400);
  });
});

describe("SSRF allow-list", () => {
  test("rejects a host not on the allow-list", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(
      req("/_x/image?url=https%3A%2F%2Fevil.example%2Fsteal.png"),
    );
    expect(res?.status).toBe(403);
  });

  test("rejects non-http(s) protocols even for allow-listed hosts", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(
      req("/_x/image?url=file%3A%2F%2Fimg.example.com%2Fetc%2Fpasswd"),
    );
    expect(res?.status).toBe(403);
  });

  test("rejects when no remote hosts are configured (route is disabled)", async () => {
    const handler = createImageProxyHandler();
    const res = await handler(
      req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"),
    );
    expect(res?.status).toBe(403);
  });
});

describe("proxying", () => {
  test("fetches an allow-listed image and streams it back with cache headers", async () => {
    mockFetch(async (url) => {
      expect(String(url)).toBe("https://img.example.com/a.png");
      return new Response("fake-bytes", {
        headers: { "content-type": "image/png" },
      });
    });

    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(200);
    expect(res?.headers.get("Content-Type")).toBe("image/png");
    expect(res?.headers.get("Cache-Control")).toBe("public, max-age=86400, immutable");
    expect(await res?.text()).toBe("fake-bytes");
  });

  test("returns 502 when the upstream errors", async () => {
    mockFetch(async () => new Response("nope", { status: 500 }));
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(502);
  });

  test("returns 502 when the upstream network call throws", async () => {
    mockFetch(async () => {
      throw new Error("connection refused");
    });
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(502);
  });

  test("returns 502 when the upstream response is not an image", async () => {
    mockFetch(async () => new Response("html", { headers: { "content-type": "text/html" } }));
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.html"));
    expect(res?.status).toBe(502);
  });
});
