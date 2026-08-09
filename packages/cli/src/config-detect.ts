import { existsSync } from "node:fs";
import { join } from "node:path";

export interface DetectedOptions {
  routesDir?: string;
  pagesDir?: string;
  apiDir?: string;
  layoutsDir?: string;
  actionsDir?: string;
  contentDir?: string;
  port: number;
  /** Passed through untouched from x.config.ts — may hold live values (functions, reporters). */
  security?: Record<string, unknown>;
  observability?: Record<string, unknown>;
  images?: Record<string, unknown>;
}

export function findConfig(projectDir: string): string | null {
  const candidates = ["x.config.ts", "x.config.js", "x.config.mjs"];
  for (const name of candidates) {
    const full = join(projectDir, name);
    if (existsSync(full)) return full;
  }
  return null;
}

function dropUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export function detectOptionsFromConfig(
  projectDir: string,
  cfg: Record<string, unknown>,
): DetectedOptions {
  const resolveDir = (dir: unknown) =>
    typeof dir === "string" ? join(projectDir, dir) : undefined;
  const guessPages = join(projectDir, "src", "pages");
  const guessRoutes = join(projectDir, "src", "routes");
  const defaultPagesDir =
    typeof cfg.pagesDir === "string"
      ? resolveDir(cfg.pagesDir)
      : typeof cfg.routesDir === "string"
        ? resolveDir(cfg.routesDir)
        : existsSync(guessPages)
          ? guessPages
          : guessRoutes;
  const contentDir =
    typeof cfg.contentDir === "string"
      ? resolveDir(cfg.contentDir)
      : existsSync(join(projectDir, "content"))
        ? join(projectDir, "content")
        : undefined;
  const actionsDir =
    typeof cfg.actionsDir === "string"
      ? resolveDir(cfg.actionsDir)
      : existsSync(join(projectDir, "src", "actions"))
        ? join(projectDir, "src", "actions")
        : undefined;
  return dropUndefined({
    routesDir: resolveDir(cfg.routesDir) || undefined,
    pagesDir: defaultPagesDir,
    apiDir: resolveDir(cfg.apiDir) || undefined,
    layoutsDir: resolveDir(cfg.layoutsDir) || undefined,
    actionsDir,
    contentDir,
    port: (cfg.port as number) ?? 3000,
    security: (cfg.security as Record<string, unknown>) ?? undefined,
    observability: (cfg.observability as Record<string, unknown>) ?? undefined,
    images: (cfg.images as Record<string, unknown>) ?? undefined,
  }) as unknown as DetectedOptions;
}

export function detectDefaultOptions(projectDir: string): DetectedOptions {
  const guessPages = join(projectDir, "src", "pages");
  const guessRoutes = join(projectDir, "src", "routes");
  const pagesDir = existsSync(guessPages) ? guessPages : guessRoutes;
  const contentDir = existsSync(join(projectDir, "content"))
    ? join(projectDir, "content")
    : undefined;
  const actionsDir = existsSync(join(projectDir, "src", "actions"))
    ? join(projectDir, "src", "actions")
    : undefined;
  return dropUndefined({
    pagesDir,
    actionsDir,
    contentDir,
    port: 3000,
  }) as unknown as DetectedOptions;
}
