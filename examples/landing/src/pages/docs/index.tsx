import {
  ArrowRight,
  BookOpen,
  Box,
  Code2,
  Cog,
  Database,
  FileJson,
  Globe,
  Layers,
  Layout,
  Package,
  Rocket,
  Server,
  Shield,
  Terminal,
  Zap,
} from "lucide-react";

const startSections = [
  {
    icon: BookOpen,
    title: "Introduction",
    desc: "What x is, how the packages fit together, and a minimal page.",
    href: "/docs/introduction",
  },
  {
    icon: Terminal,
    title: "Installation",
    desc: "Prerequisites, create command, templates, and manual setup.",
    href: "/docs/installation",
  },
  {
    icon: Rocket,
    title: "Getting Started",
    desc: "Project structure, your first page, and running the dev server.",
    href: "/docs/getting-started",
  },
];

const packageSections = [
  {
    icon: Package,
    title: "@thexjs/core",
    desc: "Rendering engine — routing, SSR/SSG, islands, server functions, data layer.",
    href: "/docs/packages/core",
  },
  {
    icon: Terminal,
    title: "@thexjs/cli",
    desc: "The x command — dev, build, start, and deployment output.",
    href: "/docs/packages/cli",
  },
  {
    icon: Box,
    title: "@thexjs/env",
    desc: "Type-safe environment variable validation with fail-fast errors.",
    href: "/docs/packages/env",
  },
  {
    icon: Server,
    title: "@thexjs/adapter-vercel",
    desc: "Zero-config Vercel Build Output API v3 adapter for serverless deployment.",
    href: "/docs/packages/adapter-vercel",
  },
];

const guideSections = [
  {
    icon: Globe,
    title: "Routing",
    desc: "File-based routing: static pages, dynamic segments, nested routes.",
    href: "/docs/routing",
  },
  {
    icon: FileJson,
    title: "Pages & Loaders",
    desc: "Static pages, server-rendered pages, and data loading.",
    href: "/docs/pages",
  },
  {
    icon: Layout,
    title: "Layouts",
    desc: "Nested layouts, dedicated layout directories, and root layouts.",
    href: "/docs/layouts",
  },
  {
    icon: Code2,
    title: "API Routes",
    desc: "Build REST endpoints alongside your frontend pages.",
    href: "/docs/api-routes",
  },
  {
    icon: Zap,
    title: "Server Functions",
    desc: "Call server-side functions from the browser without REST.",
    href: "/docs/server-functions",
  },
  {
    icon: Layers,
    title: "Content Collections",
    desc: "Markdown files with frontmatter that become routes.",
    href: "/docs/content-collections",
  },
  {
    icon: Shield,
    title: "Middleware",
    desc: "Route-level middleware for auth, redirects, and validation.",
    href: "/docs/middleware",
  },
  {
    icon: Database,
    title: "Data Layer",
    desc: "SQLite and PostgreSQL integration with migrations.",
    href: "/docs/data-layer",
  },
  {
    icon: Rocket,
    title: "Build & Deploy",
    desc: "Production builds, static export, and deployment.",
    href: "/docs/build-deploy",
  },
  {
    icon: Cog,
    title: "Configuration",
    desc: "x.config.ts reference — all options and defaults.",
    href: "/docs/configuration",
  },
  {
    icon: Shield,
    title: "Security",
    desc: "Env isolation, CSRF protection, security headers, and rate limiting.",
    href: "/docs/security",
  },
  {
    icon: Globe,
    title: "Observability",
    desc: "Structured logging, health probes, and APM error tracing.",
    href: "/docs/observability",
  },
];

function SectionGrid({
  sections,
}: {
  sections: typeof startSections;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map((s) => (
        <a
          key={s.title}
          href={s.href}
          className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <s.icon className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold transition-colors group-hover:text-primary">
            {s.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Read more <ArrowRight className="h-3 w-3" />
          </span>
        </a>
      ))}
    </div>
  );
}

export const mode = "static";

export default function DocsHubPage() {
  return (
    <div className="py-12">
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Documentation
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Everything you need to build with x
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A fullstack framework for Bun. Static sites, server-rendered pages, API routes, and server
          functions — all in a single process.
        </p>
      </div>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Start here
      </h2>
      <SectionGrid sections={startSections} />

      <h2 className="mb-4 mt-12 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Packages
      </h2>
      <SectionGrid sections={packageSections} />

      <h2 className="mb-4 mt-12 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Guides
      </h2>
      <SectionGrid sections={guideSections} />
    </div>
  );
}
