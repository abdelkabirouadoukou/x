import { readdirSync, readFileSync, statSync } from "node:fs";
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
      let frontmatter: Frontmatter;
      let body: string;
      try {
        ({ frontmatter, body } = parseFrontmatter(raw));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`${message} (in ${full})`);
      }
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

  // The closing delimiter is a `---` on its own line. Searching for `---`
  // anywhere would match a value like `title: a---b` mid-line and silently
  // truncate the frontmatter.
  const rest = trimmed.slice(3);
  const endMatch = /^---[ \t]*$/m.exec(rest);
  if (endMatch === null) {
    return { frontmatter: {}, body: trimmed };
  }

  const fmRaw = rest.slice(0, endMatch.index);
  const body = rest.slice(endMatch.index + endMatch[0].length).trimStart();

  let frontmatter: Frontmatter;
  try {
    frontmatter = parseYaml(fmRaw);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid YAML in frontmatter: ${message}`);
  }

  return { frontmatter, body };
}

/**
 * Parses frontmatter as YAML via Bun's native parser (full YAML 1.2 subset:
 * nested mappings, block scalars `|`/`>`, `- item` sequences, and scalar type
 * coercion like `draft: true` → boolean). Top-level values must be a mapping —
 * a scalar or array is rejected loudly instead of being silently dropped.
 */
function parseYaml(raw: string): Frontmatter {
  const parsed: unknown = Bun.YAML.parse(raw);
  if (parsed === undefined || parsed === null) return {};
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("expected a top-level mapping of key/value pairs");
  }
  return parsed as Frontmatter;
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

/**
 * Percent-decodes a link URL for validation, tolerating malformed escapes.
 * Decoding runs repeatedly until the string stops changing (bounded): a
 * URL encoded twice — `java%2573cript:alert(1)` → `java%73cript:alert(1)` —
 * still yields its real scheme after the second pass, so the double- and
 * triple-encoded `javascript:` bypasses are rejected like every other
 * encoding trick this sanitizer already defends against.
 */
function decodeLinkUrl(url: string): string {
  let prev = url;
  for (let i = 0; i < 5; i++) {
    let next: string;
    try {
      next = decodeURIComponent(prev);
    } catch {
      // Malformed escape — give up decoding; the remaining literal `%`
      // keeps any hidden scheme from parsing as a live scheme.
      return prev;
    }
    if (next === prev) return next;
    prev = next;
  }
  return prev;
}

/**
 * Strips the control characters the WHATWG URL spec removes from a URL
 * wherever they occur before scheme parsing. A tab, newline, or carriage
 * return embedded in the scheme portion — `java\tscript:` — defeats a naive
 * scheme regex (which sees no scheme and assumes the link is safe) while a
 * real browser still executes the resulting `javascript:` link. The strip
 * must happen before scheme detection and before the value is written into
 * the emitted `href` so no raw control character leaks into the output.
 */
function stripUrlControlChars(url: string): string {
  return url.replace(/[\t\n\r]/g, "");
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
  const clean = stripUrlControlChars(url);
  const scheme = LINK_SCHEME_RE.exec(decodeLinkUrl(clean.trim()))?.[1]?.toLowerCase();
  return scheme === undefined || ALLOWED_LINK_SCHEMES.has(scheme);
}

export function renderMarkdown(md: string): string {
  const inlineCodes: string[] = [];
  const fences: string[] = [];
  // Escape the entire source before any markup pass runs. `escapeHtml` only
  // touches `&`, `<`, `>`, `"` so every markdown construct (headings, code
  // fences, backticks, brackets) survives untouched, but raw `<script>` or
  // HTML tags in prose, fenced code, and inline code all arrive pre-escaped.
  // The tags we emit below are introduced after escaping, so they stay real
  // HTML while user content can never execute. Without this, markdown bodies
  // were injected via dangerouslySetInnerHTML with unescaped prose, so a
  // `<script>` in a .md/.mdx file ran in the visitor's browser.

  // Pull fenced code blocks out into unique placeholders immediately after
  // escaping, before any markup pass runs. The heading / inline-formatting /
  // list / link regexes must never see fence contents: a `# heading`,
  // `**bold**`, `*italic*`, or `[link](url)` inside a ``` block is literal
  // code, not markdown, and converting it would break the block's verbatim
  // promise. The placeholders are restored to their `<pre><code>` form
  // (already escaped, never re-processed) right before paragraph wrapping.
  let html = escapeHtml(md).replace(/`{3}(\w*)\n([\s\S]*?)`{3}/gm, (_m, _lang, code) => {
    // The fence body was already escaped up front — re-escaping here would
    // double-encode the `&` → `&amp;` entities just produced.
    fences.push(`<pre><code>${code.trim()}</code></pre>`);
    return `__X_FENCE_${fences.length - 1}__`;
  });

  html = html
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/`([^`]+)`/g, (_m, code) => {
      inlineCodes.push(code);
      return `__X_CODE_${inlineCodes.length - 1}__`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
      const clean = stripUrlControlChars(href);
      return isSafeLinkUrl(clean) ? `<a href="${clean}">${text}</a>` : text;
    })
    .replace(/__X_CODE_(\d+)__/g, (_m, i) => `<code>${inlineCodes[Number.parseInt(i, 10)]}</code>`);

  html = html.replace(/__X_FENCE_(\d+)__/g, (_m, i) => fences[Number.parseInt(i, 10)] ?? "");

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
