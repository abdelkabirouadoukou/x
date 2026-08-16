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

// SVG is intentionally absent: served from our own origin, attacker-scriptable
// SVGs would execute with our origin's privileges if ever embedded via
// <object>/<iframe> or navigated to directly by a user.
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
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
    const allowedUrl = (u: URL): boolean =>
      (u.protocol === "http:" || u.protocol === "https:") && allowedHosts.has(u.hostname);

    if (!allowedUrl(parsed)) {
      return new Response("host not allow-listed for image proxy", { status: 403 });
    }

    // Optional width/quality hints, forwarded by <Image> for responsive
    // srcset generation. No resizer/transcoder is wired yet, so validate and
    // ignore them (never fail the request) — the component API stays stable
    // ahead of the resize pipeline. Must stay AFTER the allow-list check and
    // affect only these optional params, never the URL being fetched.
    const wParam = reqUrl.searchParams.get("w");
    const qParam = reqUrl.searchParams.get("q");
    if (wParam !== null) {
      const w = Number.parseInt(wParam, 10);
      if (!Number.isFinite(w) || w < 1 || w > 8192) {
        return new Response("invalid w param", { status: 400 });
      }
    }
    if (qParam !== null) {
      const q = Number.parseInt(qParam, 10);
      if (!Number.isFinite(q) || q < 1 || q > 100) {
        return new Response("invalid q param", { status: 400 });
      }
    }

    const isRedirect = (status: number): boolean =>
      status === 301 || status === 302 || status === 303 || status === 307 || status === 308;

    let upstream: Response;
    try {
      // `redirect: "manual"` (the default in the fetch spec only for "restricted"
      // sets) prevents automatic redirect-following, which could let an
      // allow-listed origin redirect us to an internal/metadata endpoint. Each
      // hop is instead followed by hand and re-checked against the allow-list.
      upstream = await fetch(parsed, { redirect: "manual" });
      for (let hop = 0; hop < 5; hop++) {
        if (!isRedirect(upstream.status)) break;
        const location = upstream.headers.get("location");
        let next: URL;
        try {
          next = new URL(location ?? "", parsed);
        } catch {
          return new Response("upstream redirect was not a valid URL", { status: 502 });
        }
        if (!allowedUrl(next)) {
          return new Response("upstream redirected off the allow-list", { status: 403 });
        }
        upstream = await fetch(next, { redirect: "manual" });
      }
    } catch (err) {
      return new Response(`upstream fetch failed: ${String(err)}`, { status: 502 });
    }
    if (isRedirect(upstream.status)) {
      return new Response("too many upstream redirects", { status: 502 });
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
