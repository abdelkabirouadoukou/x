import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * A single discovered route.
 *
 * filePath  - absolute path to the route module on disk
 * routePath - the pattern to register with Bun.serve()'s `routes` option,
 *             e.g. "/", "/posts/:id", "/docs/*"
 */
export interface RouteEntry {
  filePath: string;
  routePath: string;
}

const ROUTE_FILE = /\.(tsx|ts)$/;

/**
 * Convention (mirrors Next.js/Astro/Remix so it's not a new thing to learn):
 *   src/routes/index.tsx        -> "/"
 *   src/routes/about.tsx        -> "/about"
 *   src/routes/posts/[id].tsx   -> "/posts/:id"
 *   src/routes/docs/[...all].tsx -> "/docs/*"
 *
 * Files or directories starting with "_" are skipped (layouts, private helpers).
 * This intentionally does NOT try to be clever about route precedence yet —
 * Bun.serve() resolves static routes before parameterized ones before
 * catch-alls on its own, which is exactly the order you want.
 */
export function scanRoutes(rootDir: string): RouteEntry[] {
  const entries: RouteEntry[] = [];

  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      if (name.startsWith("_") || name.startsWith(".")) continue;

      const full = join(dir, name);
      const stat = statSync(full);

      if (stat.isDirectory()) {
        walk(full);
        continue;
      }

      if (!ROUTE_FILE.test(name)) continue;

      const rel = relative(rootDir, full).replace(ROUTE_FILE, "");
      entries.push({ filePath: full, routePath: toRoutePath(rel) });
    }
  }

  walk(rootDir);
  return entries;
}

function toRoutePath(relPath: string): string {
  const segments = relPath.split(sep).map((segment) => {
    if (segment === "index") return "";
    if (segment.startsWith("[...") && segment.endsWith("]")) return "*";
    if (segment.startsWith("[") && segment.endsWith("]")) {
      return `:${segment.slice(1, -1)}`;
    }
    return segment;
  });

  const joined = segments.filter((s) => s.length > 0).join("/");
  return joined.length === 0 ? "/" : `/${joined}`;
}
