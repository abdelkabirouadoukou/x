/**
 * Minimal remote-image proxy. Fetches an allow-listed remote image
 * server-side and streams it back from your own origin at /_x/image, so the
 * browser never makes a cross-origin request and CSP img-src can stay
 * 'self'-only. No resizing/optimization — just proxy + cache headers.
 */

export interface ImageProxyOptions {
  /** Hostnames allowed to be proxied, e.g. ["stardance.hackclub.com"]. Required — an empty/missing list disables the route (404). */
  remoteHosts?: string[];
}

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "image/x-icon",
]);

/** Returns a handler for GET /_x/image?url=<encoded remote url>, or null if the request doesn't match. */
export function createImageProxyHandler(
  options: ImageProxyOptions = {},
): (req: Request) => Promise<Response | null> {
  const allowedHosts = new Set(options.remoteHosts ?? []);

  return async (req: Request) => {
    const reqUrl = new URL(req.url);
    if (reqUrl.pathname !== "/_x/image") return null;
    if (req.method !== "GET" && req.method !== "HEAD") return null;

    const target = reqUrl.searchParams.get("url");
    if (!target) return new Response("missing url param", { status: 400 });

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response("invalid url param", { status: 400 });
    }

    // Allow-list check first — this is what prevents the proxy from being
    // used as an open SSRF relay to internal hosts. Only http(s) to an
    // explicitly configured hostname is ever fetched.
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !allowedHosts.has(parsed.hostname)
    ) {
      return new Response("host not allow-listed for image proxy", { status: 403 });
    }

    let upstream: Response;
    try {
      upstream = await fetch(parsed);
    } catch (err) {
      return new Response(`upstream fetch failed: ${String(err)}`, { status: 502 });
    }
    if (!upstream.ok) {
      return new Response("upstream error", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    const baseContentType = (contentType.split(";")[0] ?? "").trim();
    if (!ALLOWED_CONTENT_TYPES.has(baseContentType)) {
      return new Response("upstream did not return an image", { status: 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Cache aggressively client + edge side — the proxied URL is the
        // cache key, and remote asset URLs like this one are typically
        // content-hashed by the origin already.
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  };
}
