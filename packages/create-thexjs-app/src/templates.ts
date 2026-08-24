import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface FeatureAddon {
  id: FeatureId;
  label: string;
  hint: string;
  default: boolean;
  requires?: FeatureId[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export type FeatureId = "tailwind" | "shadcn" | "auth" | "content" | "hooks";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_ROOT = join(__dirname, "..", "templates");
export const BASE_TEMPLATE = join(TEMPLATES_ROOT, "base");
export const ADDONS_ROOT = join(TEMPLATES_ROOT, "addons");

export const FEATURES: FeatureAddon[] = [
  {
    id: "tailwind",
    label: "Tailwind CSS",
    hint: "Utility-first styling + the x dev build pipeline",
    default: true,
    dependencies: {
      "@tailwindcss/cli": "^4.3.3",
      tailwindcss: "^4.3.3",
    },
    devDependencies: {},
  },
  {
    id: "shadcn",
    label: "shadcn/ui",
    hint: "Accessible React components (requires Tailwind)",
    default: false,
    requires: ["tailwind"],
    dependencies: {
      "@base-ui/react": "^1.6.0",
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      "lucide-react": "^1.27.0",
      "tailwind-merge": "^3.6.0",
      "tw-animate-css": "^1.4.0",
    },
    devDependencies: {
      shadcn: "^4.17.0",
    },
  },
  {
    id: "auth",
    label: "Auth (sessions + login)",
    hint: "SQLite-backed demo sessions, /login and a protected /dashboard",
    default: false,
    dependencies: {},
    devDependencies: {},
  },
  {
    id: "content",
    label: "Content collections",
    hint: "Markdown/MDX with frontmatter, auto-routed from content/",
    default: false,
    dependencies: {},
    devDependencies: {},
  },
  {
    id: "hooks",
    label: "Hooks (@thexjs/hooks)",
    hint: "SSR-safe React hooks: debounce, media query, localStorage, forms, server actions",
    default: false,
    dependencies: {},
    devDependencies: {},
  },
];

export const BASE_DEPENDENCIES: Record<string, string> = {
  react: "^19.1.0",
  "react-dom": "^19.1.0",
};

export const BASE_DEV_DEPENDENCIES: Record<string, string> = {
  "@types/bun": "latest",
  "@types/react": "^19.1.0",
  "@types/react-dom": "^19.1.0",
  typescript: "^5.8.0",
};

export function featureLabel(id: FeatureId): string {
  return FEATURES.find((f) => f.id === id)?.label ?? id;
}

export interface AutoEnabledFeature {
  added: FeatureId;
  because: FeatureId;
}

export interface NormalizedFeatures {
  features: FeatureId[];
  autoEnabled: AutoEnabledFeature[];
}

// Dedupe the selection and auto-enable any missing feature requirements
// (transitively, per the `requires` metadata above). The selected features
// themselves are never dropped — only missing requirements get added.
export function normalizeFeatures(selected: FeatureId[]): NormalizedFeatures {
  const set = new Set<FeatureId>(selected);
  const autoEnabled: AutoEnabledFeature[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const feature of FEATURES) {
      if (!set.has(feature.id)) continue;
      for (const req of feature.requires ?? []) {
        if (set.has(req)) continue;
        set.add(req);
        autoEnabled.push({ added: req, because: feature.id });
        changed = true;
      }
    }
  }
  const order = new Map(FEATURES.map((f, i) => [f.id, i] as const));
  const features = [...set].sort(
    (a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
  return { features, autoEnabled };
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

export function mergeTree(src: string, dest: string): void {
  ensureDir(dest);
  for (const entry of readdirSync(src)) {
    const from = join(src, entry);
    const to = join(dest, entry);
    const stat = statSync(from);
    if (stat.isDirectory()) {
      mergeTree(from, to);
    } else {
      cpSync(from, to);
    }
  }
}

export function copyAddon(addon: FeatureId, targetDir: string): void {
  const src = join(ADDONS_ROOT, addon);
  if (!existsSync(src)) return;
  mergeTree(src, targetDir);
}
