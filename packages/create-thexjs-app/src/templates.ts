export interface TemplateMeta {
  label: string;
  description: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export const TEMPLATES: Record<string, TemplateMeta> = {
  basic: {
    label: "Basic",
    description: "Minimal starter: pages, an API route, auth, and a dashboard.",
    dependencies: {
      "@base-ui/react": "^1.6.0",
      "@tailwindcss/cli": "^4.3.3",
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      "lucide-react": "^1.27.0",
      react: "^19.0.0",
      "react-dom": "^19.0.0",
      shadcn: "^4.15.0",
      "tailwind-merge": "^3.6.0",
      tailwindcss: "^4.3.3",
      "tw-animate-css": "^1.4.0",
    },
    devDependencies: {
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
    },
  },
  blog: {
    label: "Blog",
    description: "Markdown content collections, post listing, and post pages.",
    dependencies: {
      react: "^19.1.0",
      "react-dom": "^19.1.0",
      shadcn: "^4.2.0",
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      "tailwind-merge": "^3.2.0",
      "lucide-react": "^0.511.0",
      "tw-animate-css": "^1.2.0",
      "@base-ui/react": "^1.6.0",
    },
    devDependencies: {
      "@tailwindcss/cli": "^4.3.3",
      "@types/react": "^19.1.0",
      "@types/react-dom": "^19.1.0",
      tailwindcss: "^4.3.3",
      typescript: "^5.8.0",
    },
  },
  saas: {
    label: "SaaS",
    description: "Dashboard, settings, pricing, auth, and a data layer example.",
    dependencies: {
      react: "^19.1.0",
      "react-dom": "^19.1.0",
      shadcn: "^4.2.0",
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      "tailwind-merge": "^3.2.0",
      "lucide-react": "^0.511.0",
      "tw-animate-css": "^1.2.0",
      "@base-ui/react": "^1.6.0",
    },
    devDependencies: {
      "@tailwindcss/cli": "^4.3.3",
      "@types/react": "^19.1.0",
      "@types/react-dom": "^19.1.0",
      tailwindcss: "^4.3.3",
      typescript: "^5.8.0",
    },
  },
  landing: {
    label: "Landing",
    description: "Marketing site with docs pages, styled with shadcn/Tailwind.",
    dependencies: {
      react: "^19.1.0",
      "react-dom": "^19.1.0",
      shadcn: "^4.2.0",
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      "tailwind-merge": "^3.2.0",
      "lucide-react": "^0.511.0",
      "tw-animate-css": "^1.2.0",
      "@base-ui/react": "^1.6.0",
    },
    devDependencies: {
      "@tailwindcss/cli": "^4.3.3",
      "@types/react": "^19.1.0",
      "@types/react-dom": "^19.1.0",
      tailwindcss: "^4.3.3",
      typescript: "^5.8.0",
    },
  },
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);
