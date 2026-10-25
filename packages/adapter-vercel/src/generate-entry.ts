import type { BuildManifest } from "@thexjs/core/adapter";
import { generateAdapterEntry } from "@thexjs/core/adapter";

/**
 * Emits the source for Vercel's render-function entry: `@thexjs/core`'s
 * generic adapter entry (which builds the real `createApp()` with a
 * pre-resolved manifest) + the Vercel-specific Node <-> Web Request/Response
 * bridge, wrapped in the `(req, res) => void` handler signature that the
 * `nodejs*.x` runtime invokes.
 */
export function generateEntrySource(manifest: BuildManifest, entryDir: string): string {
  const bridge = `
// -- Vercel trusted-proxy opt-in -----------------------------------------------
// Vercel's edge always sets X-Forwarded-For correctly; trust it for IP resolution
// (brute-force guards, audit trails). See @thexjs/core security/trusted-proxy.ts.
import { configureTrustedProxy } from "@thexjs/core";
configureTrustedProxy({ trustForwardedHeaders: true });

// -- Node <-> Web Request/Response bridge (Vercel \`nodejs*.x\` runtime
//    functions are invoked Node-style: \`(req, res) => void\`).
//
// Orig string for the Web Request: Vercel's platform terminates TLS and
// forwards ${"x-forwarded-proto"} / ${"x-forwarded-host"}. We trust them only
// when they are single, clean values (multiple/duplicated values could be
// client-controlled on non-Vercel hosts and hijack redirects or CSRF origin
// checks); anything suspicious falls back to the connection metadata.
//
// Underscores ARE accepted: internal/corporate DNS zones commonly use them in
// hostnames (e.g. api_team.corp.local) even though public RFC 952/1123 names
// never do. This is a deliberate widening, not an oversight - the character
// class still fails closed on everything else (spaces, commas, control
// characters), so multiple/duplicated or malformed values never pass.
function forwardedHeader(req, name) {
  const value = req.headers[name];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    if (value.length !== 1) return undefined;
    const single = String(value[0]).trim();
    return /^[a-zA-Z0-9._\\-:]+$/.test(single) ? single : undefined;
  }
  // A comma inside a scalar header means a joined proxy chain. Truncating at
  // the first comma would validate and trust only the leftmost entry; the
  // policy here is fail-closed, so any comma-joined value falls back instead.
  const single = String(value).trim();
  if (single.includes(",")) return undefined;
  return /^[a-zA-Z0-9._\\-:]+$/.test(single) ? single : undefined;
}

function nodeRequestToWebRequest(req) {
  const proto = forwardedHeader(req, "x-forwarded-proto");
  const protocol = proto === "http" || proto === "https" ? proto : (req.socket && req.socket.encrypted ? "https" : "http");
  const forwardedHost = forwardedHeader(req, "x-forwarded-host");
  const host = forwardedHost || req.headers.host || "localhost";
  const url = \`\${protocol}://\${host}\${req.url}\`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) { for (const v of value) headers.append(key, v); }
    else headers.append(key, value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

async function sendWebResponse(response, res) {
  res.statusCode = response.status;
  // Never copy Content-Length verbatim. For streamed bodies the upstream length
  // may disagree with the bytes actually emitted: a shorter stream hangs the
  // client (it waits for bytes that never arrive), a longer one makes Node
  // destroy the socket with ERR_HTTP_CONTENT_LENGTH_MISMATCH after headers are
  // already sent. We drop it and let Node negotiate chunked transfer-encoding.
  // A computed length is only set when we intentionally buffer a small body
  // (206 partial content), so its true size is known up front.
  const isPartial = response.status === 206;
  for (const [key, value] of response.headers) {
    const lower = key.toLowerCase();
    if (lower === "set-cookie") continue;
    if (lower === "content-length") continue;
    res.setHeader(key, value);
  }
  const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  if (cookies.length > 0) res.setHeader("Set-Cookie", cookies);
  if (!response.body) { res.end(); return; }

  const reader = response.body.getReader();
  // Stop pulling from the upstream body if the client goes away, so we don't
  // keep buffering a response nobody will read.
  let cancelled = false;
  const cancel = () => { cancelled = true; reader.cancel().catch(() => {}); };
  res.on("close", cancel);
  res.on("error", cancel);
  try {
    if (isPartial) {
      // 206 partial content: buffer so we can stamp the real Content-Length.
      const chunks = [];
      let total = 0;
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        if (cancelled) break;
        chunks.push(value);
        total += value.byteLength;
      }
      if (!cancelled) {
        res.setHeader("Content-Length", String(total));
        for (const chunk of chunks) res.write(chunk);
      }
    } else {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        if (cancelled) break;
        // Honor backpressure: if the OS socket buffer is full, wait for the
        // Idle event instead of piling bytes into Node's memory.
        if (!res.write(value)) {
          await new Promise((resolve) => res.once("drain", resolve));
        }
      }
    }
  } finally {
    res.off("close", cancel);
    res.off("error", cancel);
  }
  if (!cancelled) res.end();
}

export default async function handler(req, res) {
  try {
    const request = nodeRequestToWebRequest(req);
    const response = await __x_app.fetch(request);
    await sendWebResponse(response, res);
  } catch (err) {
    console.error('[x] fatal error handling request:', err);
    // If we already sent the status line and headers, we can't write a 500
    // body -- destroy the socket instead of emitting ERR_HTTP_HEADERS_SENT.
    if (res.headersSent) { res.destroy(); return; }
    res.statusCode = 500;
    res.end("Internal server error");
  }
}
`;
  return `${generateAdapterEntry(manifest, entryDir)}\n${bridge}`;
}
