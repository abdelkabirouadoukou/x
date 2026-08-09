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
// -- Node <-> Web Request/Response bridge (Vercel \`nodejs*.x\` runtime
//    functions are invoked Node-style: \`(req, res) => void\`).
//
// Orig string for the Web Request: Vercel's platform terminates TLS and
// forwards ${"x-forwarded-proto"} / ${"x-forwarded-host"}. We trust them only
// when they are single, clean values (multiple/duplicated values could be
// client-controlled on non-Vercel hosts and hijack redirects or CSRF origin
// checks); anything suspicious falls back to the connection metadata.
function forwardedHeader(req, name) {
  const value = req.headers[name];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    if (value.length !== 1) return undefined;
    const single = String(value[0]).trim();
    return /^[a-zA-Z0-9.\\-:]+$/.test(single) ? single : undefined;
  }
  const single = String(value).split(",")[0].trim();
  return /^[a-zA-Z0-9.\\-:]+$/.test(single) ? single : undefined;
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
  for (const [key, value] of response.headers) {
    if (key.toLowerCase() === "set-cookie") continue;
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
