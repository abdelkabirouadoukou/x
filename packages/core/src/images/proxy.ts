/**
 * Minimal remote-image proxy. Fetches an allow-listed remote image
 * server-side and streams it back from your own origin at /_x/image, so the
 * browser never makes a cross-origin request and CSP img-src can stay
 * 'self'-only. No resizing/optimization — just proxy + cache headers.
 *
 * Hardening layered on top of the allow-list:
 *
 * - **Upstream byte cap** — a `Content-Length` over `maxBytes` is rejected
 *   before streaming; a chunked body is wrapped in a counting stream that
 *   aborts the instant the cap is crossed, so an allow-listed host serving a
 *   multi-GB file can't be used as a bandwidth-amplification vector.
 * - **Private/reserved address guard** — an allow-listed hostname that is
 *   itself a private or reserved IP literal (`10.x`, `169.254.169.254`,
 *   `[::1]`, ...) is refused outright, with no DNS involved and no lookup
 *   race. For hostname allow-list entries the target is additionally resolved
 *   and every returned IP must be public (DNS-rebinding defense-in-depth);
 *   supply `resolveHost` to override the default `Bun.dns.lookup`.
 * - **Post-verify connection pinning** — resolving a hostname and then
 *   letting `fetch` re-resolve it re-opens a TOCTOU window: a DNS-rebinding
 *   attacker who controls the resolver can answer the verification query with
 *   public IPs and the connection query with a metadata/private IP. So once
 *   a hostname's IPs are verified public, the connection is pinned to a
 *   verified IP with the hostname sent as the `Host` header (and, for https,
 *   as the TLS serverName, keeping SNI + certificate validation correct).
 */

export const DEFAULT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface ImageProxyOptions {
  /** Hostnames allowed to be proxied, e.g. ["stardance.hackclub.com"]. Required — an empty/missing list disables the route (404). */
  remoteHosts?: string[];
  /**
   * Max bytes to accept from an upstream image. Enforced via `Content-Length`
   * (rejected before streaming) and a counting stream (aborted mid-transfer).
   * Default: 10 MiB.
   */
  maxBytes?: number;
  /**
   * Resolves an allow-listed hostname to its IPs for the DNS-rebinding check.
   * Every returned IP must be public. The default uses `Bun.dns.lookup`
   * (RFC 2606 test/reserved TLDs are skipped). Override to pin answers or
   * route through a resolver. A resolver error fails open — an unreachable
   * DNS must not break image loading.
   */
  resolveHost?: (hostname: string) => Promise<string[]>;
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

const RFC2606_RESERVED_TLD = /\.(example|test|invalid|localhost)$|^(localhost)$/;

/** The error a wrapped upstream body is rejected with once it exceeds `maxBytes`. */
export class UpstreamImageTooLargeError extends Error {
  readonly maxBytes: number;

  constructor(maxBytes: number) {
    super(`Upstream image exceeds the ${maxBytes} byte limit`);
    this.name = "UpstreamImageTooLargeError";
    this.maxBytes = maxBytes;
  }
}

/** Returns true when `host` looks like an IP literal (v4 or v6). */
function isIpLiteral(host: string): boolean {
  const stem = host.startsWith("[") ? host.slice(1, -1) : host;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(stem) || stem.includes(":");
}

/**
 * True when `host` (an IP literal) belongs to a private or reserved range:
 * RFC 1918, loopback, link-local, CGNAT, documentation/benchmark ranges,
 * multicast/reserved, IPv6 ULAs/link-local/loopback/multicast/v4-mapped/NAT64.
 */
export function isPrivateOrReservedAddress(host: string): boolean {
  const stem = host.startsWith("[") ? host.slice(1, -1) : host;
  if (!stem.includes(":") && /^\d{1,3}(\.\d{1,3}){3}$/.test(stem)) {
    const parts = stem.split(".").map((o) => Number(o));
    if (parts.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return false;
    return isPrivateOrReservedIPv4(parts);
  }
  // IPv4-embedded IPv6 (::ffff:a.b.c.d, NAT64, 6to4): classify by the embedded
  // address — `::ffff:10.0.0.5` loops back to a private range just like 10.0.0.5.
  if (stem.includes(":")) {
    const v4Match = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(stem);
    if (v4Match) {
      const octets = (v4Match[1] ?? "").split(".").map((o) => Number(o));
      return isPrivateOrReservedIPv4(octets);
    }
  }
  const groups = ipv6Groups(stem);
  if (groups) return isPrivateOrReservedIPv6(groups);
  return false;
}

function isPrivateOrReservedIPv4(parts: number[]): boolean {
  const [a = 0, b = 0, c = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function ipv6Groups(ip: string): number[] | null {
  let head = ip;
  let tailV4: number[] | null = null;
  const lastColon = ip.lastIndexOf(":");
  if (lastColon !== -1) {
    const tail = ip.slice(lastColon + 1);
    if (tail.includes(".")) {
      const [v0 = 0, v1 = 0, v2 = 0, v3 = 0] = tail.split(".").map((o) => Number(o));
      if (v0 > 255 || v1 > 255 || v2 > 255 || v3 > 255) {
        return null;
      }
      tailV4 = [v0 * 256 + v1, v2 * 256 + v3];
      head = ip.slice(0, lastColon);
    }
  }

  const doubleColon = head.indexOf("::");
  let left = "";
  let right = "";
  if (doubleColon !== -1) {
    left = head.slice(0, doubleColon);
    right = head.slice(doubleColon + 2);
  } else {
    left = head;
  }

  const parseGroups = (s: string, out: number[]): boolean => {
    if (s === "") return true;
    for (const part of s.split(":")) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return false;
      out.push(Number.parseInt(part, 16));
    }
    return true;
  };

  const l: number[] = [];
  const r: number[] = [];
  if (!parseGroups(left, l) || !parseGroups(right, r)) return null;

  if (doubleColon !== -1) {
    const zeros = 8 - l.length - r.length - (tailV4?.length ?? 0);
    if (zeros < 1) return null;
    return [...l, ...new Array(zeros).fill(0), ...r, ...(tailV4 ?? [])];
  }

  const all = [...l, ...(tailV4 ?? []), ...r];
  return all.length === 8 ? all : null;
}

function isPrivateOrReservedIPv6(groups: number[]): boolean {
  const [a = 0, b = 0, , , , , , last = 0] = groups;
  return (
    (a === 0 && last === 1) || // loopback ::1
    groups.every((g) => g === 0) || // unspecified ::
    (a & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (a & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (a & 0xff00) === 0xff00 || // multicast ff00::/8
    (a === 0x2001 && b === 0xdb8) || // documentation 2001:db8::/32
    (a === 0x0064 && b === 0xff9b) || // NAT64 64:ff9b::/96
    (a === 0x2001 && b === 0x0010) // ORCHID 2001:10::/28
  );
}

async function resolveHostDefault(hostname: string): Promise<string[]> {
  // RFC 2606 reserved test names (`*.example`, `*.test`, ...) are used by
  // test suites and never appear in production allow-lists; skip DNS.
  if (RFC2606_RESERVED_TLD.test(hostname)) return [];
  try {
    const results = await Bun.dns.lookup(hostname);
    return results.map((r) => r.address);
  } catch {
    return [];
  }
}

/** Bun-specific fetch option: TLS settings (SNI/serverName override). */
type BunFetchTls = { tls?: { serverName: string } };
type BunRequestInit = RequestInit & BunFetchTls;

/** URL with its hostname replaced by `ip`, preserving scheme and port. */
function urlForIp(target: URL, ip: string): URL {
  const pinned = new URL(target.toString());
  pinned.hostname = ip;
  return pinned;
}

/**
 * Returns the pinned fetch target for an allow-listed URL, where the hostname
 * has already been resolved and verified public by the caller.
 *
 * Connecting by hostname would re-resolve inside `fetch` — a DNS-rebinding
 * attacker could return a public IP for the check a moment earlier and a
 * private/metadata IP for the actual connection (TOCTOU). Instead, connect
 * directly to the verified IP, send the original hostname as the `Host`
 * header, and for https set the TLS serverName so SNI + certificate
 * validation still target the hostname (not the IP).
 */
function pinToVerifiedIp(target: URL, verifiedIp: string): { url: URL; init: BunRequestInit } {
  const init: BunRequestInit = { redirect: "manual", headers: { host: target.host } };
  if (target.protocol === "https:") {
    init.tls = { serverName: target.hostname };
  }
  return { url: urlForIp(target, verifiedIp), init };
}

type ResolvedProxyTarget =
  | { status: "ok"; url: URL; init: BunRequestInit }
  | { status: "reject-literal" }
  | { status: "reject-dns" };

/**
 * Resolves and pins a proxy target without ever letting `fetch` re-resolve it.
 *
 * - An IP literal is used as-is (a reserved literal is refused).
 * - A hostname is resolved once; if any answer is private/reserved the target
 *   is refused, otherwise the connection is pinned to a verified public IP so
 *   a DNS-rebinding attacker can't swap the answer between this check and the
 *   actual connection. Empty answers / resolver errors fail open (fetch the
 *   hostname as-is), so a DNS outage can't break image loading.
 */
async function resolveProxyTarget(
  target: URL,
  resolveHost: (hostname: string) => Promise<string[]>,
): Promise<ResolvedProxyTarget> {
  if (isIpLiteral(target.hostname)) {
    if (isPrivateOrReservedAddress(target.hostname)) {
      return { status: "reject-literal" };
    }
    return { status: "ok", url: target, init: { redirect: "manual" as const } };
  }
  let ips: string[] = [];
  try {
    ips = await resolveHost(target.hostname);
  } catch {
    ips = [];
  }
  if (ips.some((ip) => isPrivateOrReservedAddress(ip))) {
    return { status: "reject-dns" };
  }
  const verifiedIp = ips[0];
  if (verifiedIp !== undefined) {
    const { url, init } = pinToVerifiedIp(target, verifiedIp);
    return { status: "ok", url, init };
  }
  return { status: "ok", url: target, init: { redirect: "manual" as const } };
}

/** Wraps an upstream body in a counting stream that aborts past `maxBytes`. */
function enforceImageByteCount(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): ReadableStream<Uint8Array> | null {
  if (body === null) return null;
  const source = body;
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let total = 0;

  const pump = async () => {
    const reader = source.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          // Stop reading the source — the abort-before-buffering half.
          await reader.cancel().catch(() => {});
          await writer.abort(new UpstreamImageTooLargeError(maxBytes));
          return;
        }
        await writer.write(value);
      }
      await writer.close();
    } catch (err) {
      await writer.abort(err);
    }
  };
  void pump();

  return readable;
}

/** Returns a handler for GET /_x/image?url=<encoded remote url>, or null if the request doesn't match. */
export function createImageProxyHandler(
  options: ImageProxyOptions = {},
): (req: Request) => Promise<Response | null> {
  const allowedHosts = new Set(options.remoteHosts ?? []);
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const resolveHost = options.resolveHost ?? resolveHostDefault;

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

    // Resolve the target once, verify every IP is public, and pin the
    // connection to a verified IP so nothing re-resolves (DNS-rebinding
    // TOCTOU). Literal private/reserved targets are refused outright.
    const rejectFor = (
      status: Exclude<ResolvedProxyTarget["status"], "ok">,
      hop: boolean,
    ): Response => {
      if (status === "reject-literal") {
        return new Response(
          hop
            ? "upstream redirected to a private or reserved address"
            : "target is a private or reserved address",
          { status: 403 },
        );
      }
      return new Response(
        hop
          ? "upstream redirect resolves to a private or reserved address"
          : "target resolves to a private or reserved address",
        { status: 403 },
      );
    };

    const initial = await resolveProxyTarget(parsed, resolveHost);
    if (initial.status !== "ok") {
      return rejectFor(initial.status, false);
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
      // hop is instead followed by hand and re-checked against the allow-list,
      // and re-pinned (resolve once, verify public, connect to the verified IP).
      upstream = await fetch(initial.url, initial.init);
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
        // Re-run the resolve + pin on each hop — the interesting SSRF case is
        // exactly a redirect hop landing on a private/reserved target.
        const hopTarget = await resolveProxyTarget(next, resolveHost);
        if (hopTarget.status !== "ok") {
          return rejectFor(hopTarget.status, true);
        }
        upstream = await fetch(hopTarget.url, hopTarget.init);
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

    // Declared length is already over the cap: refuse before streaming
    // (and stop pulling the upstream body).
    const contentLength = upstream.headers.get("content-length");
    if (contentLength !== null && Number(contentLength) > maxBytes) {
      await upstream.body?.cancel().catch(() => {});
      return new Response("upstream image exceeds the size limit", { status: 502 });
    }

    return new Response(enforceImageByteCount(upstream.body, maxBytes), {
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
