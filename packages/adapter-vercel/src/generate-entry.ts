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
function nodeRequestToWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
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
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

export default async function handler(req, res) {
  try {
    const request = nodeRequestToWebRequest(req);
    const response = await __x_app.fetch(request);
    await sendWebResponse(response, res);
  } catch (err) {
    console.error('[x] fatal error handling request:', err);
    res.statusCode = 500;
    res.end("Internal server error");
  }
}
`;
  return `${generateAdapterEntry(manifest, entryDir)}\n${bridge}`;
}
