import { afterEach, describe, expect, test } from "bun:test";
import {
  createImageProxyHandler,
  isPrivateOrReservedAddress,
  UpstreamImageTooLargeError,
} from "./proxy";

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
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fevil.example%2Fsteal.png"));
    expect(res?.status).toBe(403);
  });

  test("rejects non-http(s) protocols even for allow-listed hosts", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=file%3A%2F%2Fimg.example.com%2Fetc%2Fpasswd"));
    expect(res?.status).toBe(403);
  });

  test("rejects when no remote hosts are configured (route is disabled)", async () => {
    const handler = createImageProxyHandler();
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
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

  test("returns 502 for SVG upstreams (served from our origin, they'd carry origin privileges)", async () => {
    mockFetch(async () => new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }));
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.svg"));
    expect(res?.status).toBe(502);
  });
});

describe("upstream size cap", () => {
  test("rejects an upstream whose declared Content-Length exceeds the cap", async () => {
    mockFetch(
      async () =>
        new Response("x".repeat(500), {
          headers: { "content-type": "image/png", "content-length": "500" },
        }),
    );
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"], maxBytes: 100 });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(502);
    expect(await res?.text()).toBe("upstream image exceeds the size limit");
  });

  test("aborts the stream mid-transfer when an undeclared-length upstream exceeds the cap", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await gate;
        controller.enqueue(new TextEncoder().encode("x".repeat(64)));
        controller.close();
      },
    });
    mockFetch(async () => new Response(stream, { headers: { "content-type": "image/png" } }));

    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"], maxBytes: 32 });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(200);
    release();
    await expect((res as Response).text()).rejects.toThrow(UpstreamImageTooLargeError);
  });

  test("the default cap accepts a healthy-sized image", async () => {
    mockFetch(
      async () =>
        new Response("x".repeat(2048), {
          headers: { "content-type": "image/png", "content-length": "2048" },
        }),
    );
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(200);
    expect(await res?.text()).toHaveLength(2048);
  });
});

describe("private/reserved address guard", () => {
  test("classifies private and reserved ranges", () => {
    for (const ip of [
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "127.0.0.1",
      "169.254.169.254",
      "100.64.0.1",
      "192.0.2.10",
      "198.18.0.1",
      "203.0.113.7",
      "224.0.0.1",
      "0.0.0.0",
      "::1",
      "::",
      "fc00::1",
      "fe80::1",
      "ff02::1",
      "2001:db8::1",
      "::ffff:10.0.0.5",
    ]) {
      expect(isPrivateOrReservedAddress(ip)).toBe(true);
    }
    // NAT64 maps a public v4 (1.2.3.4) — not reserved; the nested v4 rules.
    for (const ip of ["8.8.8.8", "93.184.216.34", "2606:4700::6810:84e5", "64:ff9b::1.2.3.4"]) {
      expect(isPrivateOrReservedAddress(ip)).toBe(false);
    }
  });

  test("refuses an allow-listed host that is a private IP literal", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["10.0.0.5"] });
    const res = await handler(req("/_x/image?url=http%3A%2F%2F10.0.0.5%2Fsteal.png"));
    expect(res?.status).toBe(403);
  });

  test("refuses the cloud metadata IP even when allow-listed", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["169.254.169.254"] });
    const res = await handler(
      req("/_x/image?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F"),
    );
    expect(res?.status).toBe(403);
  });

  test("refuses an allow-listed hostname that resolves to a private IP", async () => {
    const handler = createImageProxyHandler({
      remoteHosts: ["img.example.com"],
      resolveHost: async () => ["10.0.0.5"],
    });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(403);
  });

  test("allows an allow-listed hostname that resolves to public IPs", async () => {
    mockFetch(async () => new Response("x", { headers: { "content-type": "image/png" } }));
    const handler = createImageProxyHandler({
      remoteHosts: ["img.example.com"],
      resolveHost: async () => ["93.184.216.34", "2606:4700::6810:84e5"],
    });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(200);
    expect(await res?.text()).toBe("x");
  });

  test("an unresolvable allow-listed hostname fails open", async () => {
    mockFetch(async () => new Response("x", { headers: { "content-type": "image/png" } }));
    const handler = createImageProxyHandler({
      remoteHosts: ["img.example.com"],
      resolveHost: async () => [],
    });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(200);
  });

  test("rejects a redirect hop that resolves to a private IP", async () => {
    const fetched: Array<{ url: string; host: string | null }> = [];
    mockFetch(async (url, init) => {
      fetched.push({ url: String(url), host: new Headers(init?.headers).get("host") });
      return new Response(null, {
        status: 302,
        headers: { location: "https://cdn.example.com/img.png" },
      });
    });
    const handler = createImageProxyHandler({
      remoteHosts: ["img.example.com"],
      resolveHost: async (host) =>
        host === "img.example.com" ? ["93.184.216.34"] : ["192.168.1.10"],
    });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(403);
    // The initial hop was connected to the verified public IP (pinned), and
    // the private-resolving redirect hop was never fetched.
    expect(fetched).toEqual([{ url: "https://93.184.216.34/a.png", host: "img.example.com" }]);
  });

  test("pins the connection to a resolved public IP (DNS-rebinding TOCTOU)", async () => {
    const seen: Array<{
      url: string;
      host: string | null;
      serverName?: string;
    }> = [];
    mockFetch(async (url, init) => {
      const tls = (init as RequestInit & { tls?: { serverName?: string } }).tls;
      seen.push({
        url: String(url),
        host: new Headers(init?.headers).get("host"),
        ...(tls?.serverName !== undefined ? { serverName: tls.serverName } : {}),
      });
      return new Response("x", { headers: { "content-type": "image/png" } });
    });
    const handler = createImageProxyHandler({
      remoteHosts: ["img.example.com"],
      resolveHost: async () => ["93.184.216.34", "2606:4700::6810:84e5"],
    });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(200);
    // Never fetch by hostname — the connection is pinned to a verified public
    // IP, with the hostname preserved via Host + TLS serverName so origin and
    // certificate handling stay correct. A rebinding attacker who flips DNS
    // after this point is now ignored.
    expect(seen).toEqual([
      {
        url: "https://93.184.216.34/a.png",
        host: "img.example.com",
        serverName: "img.example.com",
      },
    ]);
  });

  test("pins each allow-listed redirect hop to its verified IP", async () => {
    const seen: string[] = [];
    mockFetch(async (url) => {
      seen.push(String(url));
      if (seen.length === 1) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://img.example.com/cdn/a.png" },
        });
      }
      return new Response("ok", { headers: { "content-type": "image/png" } });
    });
    const handler = createImageProxyHandler({
      remoteHosts: ["img.example.com"],
      resolveHost: async () => ["93.184.216.34"],
    });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(200);
    expect(seen).toEqual(["https://93.184.216.34/a.png", "https://93.184.216.34/cdn/a.png"]);
  });
});

describe("redirect handling (SSRF)", () => {
  test("follows an allow-listed redirect hop", async () => {
    let calls = 0;
    mockFetch(async (url) => {
      calls++;
      if (calls === 1) {
        expect(String(url)).toBe("https://img.example.com/a.png");
        return new Response(null, {
          status: 302,
          headers: { location: "https://img.example.com/cdn/a.png" },
        });
      }
      expect(String(url)).toBe("https://img.example.com/cdn/a.png");
      return new Response("fake-bytes", { headers: { "content-type": "image/png" } });
    });

    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(200);
    expect(await res?.text()).toBe("fake-bytes");
  });

  test("rejects a redirect that leaves the allow-list", async () => {
    mockFetch(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        }),
    );
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(403);
  });

  test("rejects a redirect to a non-http(s) scheme", async () => {
    mockFetch(
      async () => new Response(null, { status: 301, headers: { location: "file:///etc/passwd" } }),
    );
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(403);
  });

  test("rejects more than 5 redirect hops", async () => {
    mockFetch(
      async () =>
        new Response(null, {
          status: 307,
          headers: { location: "https://img.example.com/loop" },
        }),
    );
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png"));
    expect(res?.status).toBe(502);
  });
});

describe("width/quality hints", () => {
  test("accepts and ignores a valid w param (no resizer wired yet)", async () => {
    mockFetch(async (url) => {
      expect(String(url)).toBe("https://img.example.com/a.png");
      return new Response("x", { headers: { "content-type": "image/png" } });
    });
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png&w=640"));
    expect(res?.status).toBe(200);
    // no resizer: the body is untouched, not a resized variant
    expect(await res?.text()).toBe("x");
  });

  test("accepts and ignores a valid q param", async () => {
    mockFetch(async () => new Response("x", { headers: { "content-type": "image/png" } }));
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png&q=75"));
    expect(res?.status).toBe(200);
  });

  test("rejects an out-of-range w param", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png&w=99999"));
    expect(res?.status).toBe(400);
  });

  test("rejects a non-numeric q param", async () => {
    const handler = createImageProxyHandler({ remoteHosts: ["img.example.com"] });
    const res = await handler(req("/_x/image?url=https%3A%2F%2Fimg.example.com%2Fa.png&q=abc"));
    expect(res?.status).toBe(400);
  });
});
