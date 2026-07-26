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
        // leave as string
      }
    }
    result[key] = value;
  }
  return result;
}
