/**
 * Generates docs-search.json from the built docs HTML under the client
 * output dir. Run after `x build` (wired into the landing build script).
 * Each docs page is parsed for its h1/h2/h3 headings and paragraph/pre text
 * so the search island can filter everything client-side without a server
 * round-trip.
 *
 * The client output dir differs by build mode: `x build` writes to `.x/client`
 * while `x build --adapter vercel` writes the core scratch output to
 * `.vercel/output/.scratch-core/client` before the adapter publishes
 * `.vercel/output/static`. We publish the index into every existing client dir
 * plus public/, so the file is present both for local static serving and in
 * the Vercel Build Output tree.
 *
 * The id assignment mirrors the runtime on-this-page script in
 * src/pages/docs/_layout.tsx: every h2/h3 in .doc-content gets
 * `#sec-{i}` in DOM order, which keeps result anchors exact.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface Block {
  kind: "h1" | "h2" | "h3" | "p" | "li" | "pre";
  text: string;
  /** `#sec-N` anchor when this block is an h2/h3 (matches on-this-page script) */
  anchor: string;
}

interface PageEntry {
  route: string;
  title: string;
  blocks: Block[];
}

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

/** Every dir that can hold the built client output (docs HTML lives inside). */
const CLIENT_CANDIDATES = [
  join(ROOT, ".vercel", "output", ".scratch-core", "client"),
  join(ROOT, ".vercel", "output", "static"),
  join(ROOT, ".x", "client"),
];

const OUT = join(ROOT, "public", "docs-search.json");

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files.push(...walk(p));
    else if (name === "index.html") files.push(p);
  }
  return files;
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decode(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tag-strip that keeps code tokens dense (no injected whitespace). */
function stripTagsDense(s: string): string {
  return decode(s)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Slice of html covering the .doc-content div (or null). */
function docSlice(html: string): string | null {
  const marker = 'class="doc-content"';
  const midx = html.indexOf(marker);
  if (midx < 0) return null;
  const openAt = html.lastIndexOf("<div", midx);
  if (openAt < 0) return null;
  let i = openAt;
  let depth = 0;
  while (i < html.length) {
    const open = html.indexOf("<div", i);
    const close = html.indexOf("</div>", i);
    if (close < 0) break;
    if (open >= 0 && open < close) {
      depth += 1;
      i = open + 4;
    } else {
      depth -= 1;
      i = close + 6;
      if (depth === 0) return html.slice(openAt, close + 6);
    }
  }
  return null;
}

const BLOCK_RE = /<(h[123]|p|li|pre)\b[^>]*>([\s\S]*?)<\/\1>/g;

function parsePage(route: string, html: string): PageEntry {
  const blocks: Block[] = [];
  const slice = docSlice(html);
  if (!slice) return { route, title: "", blocks };
  let sec = 0;
  for (const m of slice.matchAll(BLOCK_RE)) {
    const kind = m[1] as Block["kind"];
    const text = kind === "pre" ? stripTagsDense(m[2]) : stripTags(m[2]);
    if (!text) continue;
    if (kind === "pre") {
      // only keep short code blocks — long listings add noise to results
      if (text.length > 500) continue;
    }
    const anchor = kind === "h2" || kind === "h3" ? `#sec-${sec++}` : "";
    blocks.push({ kind, text, anchor });
  }
  const title = blocks.find((b) => b.kind === "h1")?.text ?? "";
  return { route, title, blocks };
}

function main() {
  const dirsWithDocs = CLIENT_CANDIDATES.filter((dir) => existsSync(join(dir, "docs")));
  if (dirsWithDocs.length === 0) {
    throw new Error(
      `[docs-search] no client docs dir found; tried:\n${CLIENT_CANDIDATES.map((d) => `  ${d}`).join("\n")}\n` +
        "Run `x build` (or `x build --adapter vercel`) first.",
    );
  }
  const client = dirsWithDocs[0];

  const pages: PageEntry[] = walk(join(client, "docs"))
    .sort()
    .map((file) => {
      const route = `/${file.slice(client.length + 1).replace(/\/index\.html$/, "")}`;
      return parsePage(route, readFileSync(file, "utf8"));
    })
    .filter((p) => p.blocks.length > 0);

  const payload = `${JSON.stringify({ version: 1, pages }, null, 2)}\n`;
  const targets = [OUT, ...dirsWithDocs.map((dir) => join(dir, "docs-search.json"))];
  for (const target of targets) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, payload);
  }
  console.log(
    `[docs-search] indexed ${pages.length} pages from ${client} -> ${targets.length} file(s)`,
  );
}

main();
