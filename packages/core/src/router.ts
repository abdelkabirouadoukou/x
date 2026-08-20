import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export interface RouteEntry {
  filePath: string;
  routePath: string;
  paramNames: string[];
  isApi: boolean;
}

export interface MiddlewareEntry {
  filePath: string;
  dirPath: string;
}

const ROUTE_FILE = /\.(tsx|ts)$/;

/** Scan page routes — same as scanRoutes but never marks anything as api. */
export function scanPages(rootDir: string): RouteEntry[] {
  return scanRoutes(rootDir).map((r) => ({ ...r, isApi: false }));
}

/** Scan API routes from a separate directory (not nested under pages/routes).
 *  Route paths are prefixed with /api so they match requests to /api/…. */
export function scanApiDir(rootDir: string): RouteEntry[] {
  return scanRoutes(rootDir).map((r) => ({
    ...r,
    routePath: r.routePath === "/" ? "/api" : `/api${r.routePath}`,
    isApi: true,
  }));
}

export function scanRoutes(rootDir: string): RouteEntry[] {
  // If rootDir doesn't exist, return empty
  try {
    statSync(rootDir);
  } catch {
    return [];
  }

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
      entries.push(toRouteEntry(rel, full));
    }
  }

  walk(rootDir);
  return entries;
}

function toRouteEntry(relPath: string, filePath: string): RouteEntry {
  const segments = relPath.split(sep);
  const paramNames: string[] = [];
  const isApi = segments[0] === "api";

  const routeSegments = segments.map((segment) => {
    if (segment === "index") return "";
    if (segment.startsWith("[...") && segment.endsWith("]")) {
      const name = segment.slice(4, -1);
      paramNames.push(name);
      return "*";
    }
    if (segment.startsWith("[") && segment.endsWith("]")) {
      const name = segment.slice(1, -1);
      paramNames.push(name);
      return `:${name}`;
    }
    return segment;
  });

  const joined = routeSegments.filter((s) => s.length > 0).join("/");
  const routePath = joined.length === 0 ? "/" : `/${joined}`;

  return { filePath, routePath, paramNames, isApi };
}

export interface LayoutEntry {
  filePath: string;
  dirPath: string;
}

export function scanLayouts(rootDir: string): LayoutEntry[] {
  const entries: LayoutEntry[] = [];

  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      const stat = statSync(full);

      if (stat.isDirectory()) {
        walk(full);
      } else if (name === "_layout.tsx" || name === "_layout.ts") {
        entries.push({ filePath: full, dirPath: dir });
      }
    }
  }

  walk(rootDir);
  return entries;
}

/**
 * Scan a dedicated layouts directory. Every layout file found is registered
 * as a root-level layout. The file name becomes the layout key (e.g.
 * main.tsx -> "main"), and it covers the root path "/" so it wraps every page.
 * Nested _layout.tsx files inside pages/ still work for directory-level
 * nesting — this is additive, not exclusive.
 */
export function scanLayoutsDir(layoutsDir: string): LayoutEntry[] {
  const entries: LayoutEntry[] = [];
  try {
    if (!statSync(layoutsDir).isDirectory()) return entries;
  } catch {
    return entries;
  }

  for (const name of readdirSync(layoutsDir)) {
    if (name.startsWith(".")) continue;
    const full = join(layoutsDir, name);
    const stat = statSync(full);
    if (stat.isFile() && (name.endsWith(".tsx") || name.endsWith(".ts"))) {
      entries.push({ filePath: full, dirPath: layoutsDir });
    }
  }

  return entries;
}

export function findLayoutChain(
  routeFilePath: string,
  layouts: LayoutEntry[],
  routesDir: string,
): LayoutEntry[] {
  const routeDir = join(routeFilePath, "..");
  const chain: LayoutEntry[] = [];

  let current = routeDir;
  while (current.startsWith(routesDir)) {
    const layout = layouts.find((l) => l.dirPath === current);
    if (layout) chain.unshift(layout);
    const parent = join(current, "..");
    if (parent === current) break;
    current = parent;
  }

  return chain;
}

export interface NotFoundEntry {
  filePath: string;
}

const NOT_FOUND_CANDIDATES = ["_404.tsx", "_404.ts"];

export function scanNotFound(rootDir: string): NotFoundEntry | null {
  for (const name of NOT_FOUND_CANDIDATES) {
    const full = join(rootDir, name);
    try {
      statSync(full);
      return { filePath: full };
    } catch {
      // doesn't exist
    }
  }
  return null;
}

export function scanMiddleware(rootDir: string): MiddlewareEntry[] {
  const entries: MiddlewareEntry[] = [];

  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      const stat = statSync(full);

      if (stat.isDirectory()) {
        walk(full);
      } else if (name === "_middleware.ts" || name === "_middleware.tsx") {
        entries.push({ filePath: full, dirPath: dir });
      }
    }
  }

  walk(rootDir);
  return entries;
}

export function findMiddlewareChain(
  routeFilePath: string,
  middleware: MiddlewareEntry[],
  routesDir: string,
): MiddlewareEntry[] {
  const routeDir = join(routeFilePath, "..");
  const chain: MiddlewareEntry[] = [];

  let current = routeDir;
  while (current.startsWith(routesDir)) {
    const mw = middleware.find((m) => m.dirPath === current);
    if (mw) chain.unshift(mw);
    const parent = join(current, "..");
    if (parent === current) break;
    current = parent;
  }

  return chain;
}

export function routePatternToRegex(routePath: string): RegExp {
  // Escape every regex metacharacter in literal segments so a folder like
  // `v1.2` compiles to `v1\.2` (matching only `v1.2`, not `v1x2`). The
  // dynamic tokens are left intact and expanded afterwards: `:param` keeps its
  // capture group and `*` keeps its catch-all, so their inserted pattern
  // syntax isn't double-escaped.
  const escaped = routePath
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\//g, "\\/")
    .replace(/:(\w+)/g, "([^/]+)")
    .replace(/\*/g, "(.+)");

  return new RegExp(`^${escaped}$`);
}

export function extractParams(
  routePath: string,
  paramNames: string[],
  url: string,
): Record<string, string> | null {
  const regex = routePatternToRegex(routePath);
  const match = url.match(regex);
  if (!match) return null;

  const params: Record<string, string> = {};
  let idx = 1;
  for (const name of paramNames) {
    const value = match[idx];
    if (value !== undefined) {
      // URL pathnames are percent-encoded; decparingly decode so loaders and
      // components receive "hello world", not "hello%20world". Malformed
      // escapes fall back to the raw value.
      params[name] = safeDecodeURIComponent(value);
    }
    idx++;
  }
  return params;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function generateManifestSource(routes: RouteEntry[]): string {
  const routeEntries = routes.map((r) => {
    const paramsType =
      r.paramNames.length === 0
        ? "Record<string, never>"
        : `{ ${r.paramNames.map((n) => `${n}: string`).join("; ")} }`;
    return `  "${r.routePath}": ${paramsType};`;
  });

  return `// Auto-generated by @thexjs/core -- do not edit
export type RouteMap = {
${routeEntries.join("\n")}
};

export function href<T extends keyof RouteMap & string>(
  path: T,
  ...[params]: RouteMap[T] extends Record<string, never> ? [] : [RouteMap[T]]
): string {
  if (!params) return path;
  let result: string = path;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(\`:\${key}(?=/|$)\`), encodeURIComponent(String(value)));
  }
  // Catch-all params have no \`:name\` token in the path — they render as an
  // anonymous \`*\` segment. Substitute them in segment order, keeping \`/\`
  // between encoded fragments so multi-segment values stay readable.
  for (const [key, value] of Object.entries(params)) {
    if (!path.includes(\`:\${key}\`)) {
      const encoded = String(value)
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      result = result.replace(/\\*/, encoded);
    }
  }
  result = result.replace(/\\*+$/, "");
  return result;
}
`;
}

export function writeManifest(routes: RouteEntry[], routesDir: string): string {
  const source = generateManifestSource(routes);
  const manifestPath = join(routesDir, "..", "x-routes.ts");
  writeFileSync(manifestPath, source, "utf-8");
  return manifestPath;
}
