import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export interface Frontmatter {
  title?: string;
  [key: string]: unknown;
}

export interface ContentEntry {
  filePath: string;
  routePath: string;
  slug: string;
  frontmatter: Frontmatter;
  body: string;
}

const CONTENT_FILE = /\.(md|mdx)$/;

export function scanContent(rootDir: string): ContentEntry[] {
  const entries: ContentEntry[] = [];

  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      const stat = statSync(full);

      if (stat.isDirectory()) {
        walk(full);
        continue;
      }

      if (!CONTENT_FILE.test(name)) continue;

      const raw = readFileSync(full, "utf-8");
      const { frontmatter, body } = parseFrontmatter(raw);
      const rel = relative(rootDir, full).replace(CONTENT_FILE, "");
      const slug = name.replace(CONTENT_FILE, "");
      const routePath = toContentRoutePath(rel);

      entries.push({ filePath: full, routePath, slug, frontmatter, body });
    }
  }

  walk(rootDir);
  return entries;
}

function toContentRoutePath(relPath: string): string {
  const segments = relPath.split(sep).filter((s) => s !== "index");
  const joined = segments.join("/");
  return joined.length === 0 ? "/" : `/${joined}`;
}

export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const trimmed = raw.trimStart();

  if (!trimmed.startsWith("---")) {
    return { frontmatter: {}, body: trimmed };
  }

  const endIndex = trimmed.indexOf("---", 3);
  if (endIndex === -1) {
    return { frontmatter: {}, body: trimmed };
  }

  const fmRaw = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 3).trimStart();
  const frontmatter = parseYamlLines(fmRaw);

  return { frontmatter, body };
}

function parseYamlLines(raw: string): Frontmatter {
  const result: Frontmatter = {};
  for (const line of raw.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value: unknown = line.slice(colon + 1).trim();
    if (typeof value === "string" && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (typeof value === "string" && value.startsWith("[")) {
      try {
        value = JSON.parse(value);
      } catch {
        value = (value as string)
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    result[key] = value;
  }
  return result;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Converts a contiguous block of `- item` / `1. item` lines into a `<ul>` /
 * `<ol>` element. Returns the block untouched when it isn't a list.
 */
function renderListBlock(block: string): string {
  const lines = block.split("\n");
  const isUl = lines.every((l) => /^\s*[-*]\s+/.test(l));
  const isOl = lines.every((l) => /^\s*\d+\.\s+/.test(l));
  if (!isUl && !isOl) return block;
  const tag = isUl ? "ul" : "ol";
  const items = lines
    .map((l) => `<li>${l.replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+\.\s+/, "")}</li>`)
    .join("");
  return `<${tag}>${items}</${tag}>`;
}

const ALLOWED_LINK_SCHEMES = new Set(["http", "https", "mailto"]);
const LINK_SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;

/** Percent-decodes a link URL for validation, tolerating malformed escapes. */
function decodeLinkUrl(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

/**
 * True when a markdown link URL is safe to emit in an `href` attribute.
 * `escapeHtml` neutralizes `& < > "` but not URL schemes, so an href like
 * `javascript:alert(1)` — including a percent-encoded variant such as
 * `javascript:alert%281%29` or `java%73cript:...` — would otherwise produce a
 * live `javascript:` link that executes on click. Only the `http`, `https`
 * and `mailto` schemes are allowed; any other scheme-prefixed URL is rejected.
 * Relative and scheme-relative URLs (`/foo`, `./foo`, `../foo`, `#anchor`,
 * `?q=1`, `//cdn.example.com`) carry no scheme and pass through.
 */
function isSafeLinkUrl(url: string): boolean {
  const scheme = LINK_SCHEME_RE.exec(decodeLinkUrl(url.trim()))?.[1]?.toLowerCase();
  return scheme === undefined || ALLOWED_LINK_SCHEMES.has(scheme);
}

export function renderMarkdown(md: string): string {
  const inlineCodes: string[] = [];
  // Escape the entire source before any markup pass runs. `escapeHtml` only
  // touches `&`, `<`, `>`, `"` so every markdown construct (headings, code
  // fences, backticks, brackets) survives untouched, but raw `<script>` or
  // HTML tags in prose, fenced code, and inline code all arrive pre-escaped.
  // The tags we emit below are introduced after escaping, so they stay real
  // HTML while user content can never execute. Without this, markdown bodies
  // were injected via dangerouslySetInnerHTML with unescaped prose, so a
  // `<script>` in a .md/.mdx file ran in the visitor's browser.
  let html = escapeHtml(md)
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // The fence body was already escaped up front — re-escaping here would
    // double-encode the `&` → `&amp;` entities just produced.
    .replace(
      /`{3}(\w*)\n([\s\S]*?)`{3}/gm,
      (_m, _lang, code) => `<pre><code>${code.trim()}</code></pre>`,
    )
    .replace(/`([^`]+)`/g, (_m, code) => {
      inlineCodes.push(code);
      return `__X_CODE_${inlineCodes.length - 1}__`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) =>
      isSafeLinkUrl(href) ? `<a href="${href}">${text}</a>` : text,
    )
    .replace(/__X_CODE_(\d+)__/g, (_m, i) => `<code>${inlineCodes[Number.parseInt(i)]}</code>`);

  const blocks = html.split(/\n\n+/);
  html = blocks
    .map((b) => {
      const t = b.trim();
      if (!t) return "";
      const listBlock = renderListBlock(t);
      if (listBlock !== t) return listBlock;
      if (t.startsWith("<h") || t.startsWith("<pre") || t.startsWith("<ul") || t.startsWith("<ol"))
        return t;
      return `<p>${t}</p>`;
    })
    .join("\n");

  return html;
}
