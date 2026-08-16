export interface FeatureAddon {
  id: FeatureId;
  label: string;
  hint: string;
  default: boolean;
  requires?: FeatureId[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export type FeatureId = "tailwind" | "shadcn" | "auth" | "content";

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
