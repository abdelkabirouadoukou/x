import {
  ArrowRight,
  BarChart3,
  Box,
  Code2,
  FileJson,
  Globe,
  Layers,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

const allFeatures = [
  {
    icon: Zap,
    title: "One process, everything included",
    desc: "Static sites, SSR, API routes, and server functions all run in a single Bun process. No microservices, no orchestration, no separate API server.",
  },
  {
    icon: FileJson,
    title: "File-based routing",
    desc: "Your file tree is your route tree. Drop a page in src/pages/ and it's immediately available. Dynamic segments, nested routes, and catch-all 404s come for free.",
  },
  {
    icon: Layers,
    title: "Static + dynamic hybrid",
    desc: "Pick the right rendering mode per route. Use mode='static' for prerendered marketing pages, and server mode for personalized dashboards — all in the same project.",
  },
  {
    icon: Globe,
    title: "API routes built in",
    desc: "Build REST endpoints alongside your frontend. Shared types, same process, zero config. Middleware support for auth, validation, and logging.",
  },
  {
    icon: Server,
    title: "Server functions",
    desc: "Call server-side functions from the browser without writing REST endpoints. Import them into a client component and call them directly, or by hand with fetch.",
  },
  {
    icon: Shield,
    title: "Type safe end to end",
    desc: "TypeScript from loader to component. LoaderData is typed through RouteProps, params are inferred from file paths, and server functions are fully typed.",
  },
  {
    icon: BarChart3,
    title: "Content collections",
    desc: "Write markdown files with frontmatter and x turns them into pages. Built-in rendering with code highlighting, slug generation, and frontmatter parsing.",
  },
  {
    icon: Sparkles,
    title: "Live reload",
    desc: "See changes instantly. The dev server watches pages, layouts, API routes, and actions. No manual restarts, no build step during development.",
  },
  {
    icon: Box,
    title: "Optimized production builds",
    desc: "One command produces static HTML, a server bundle, and a build manifest. Deploy anywhere Bun runs — Fly.io, Railway, Docker, or a VPS.",
  },
  {
    icon: Code2,
    title: "Islands architecture",
    desc: "Interactive client components hydrate in place. The rest of the page is static HTML. Minimal JavaScript, maximum performance.",
  },
  {
    icon: RefreshCw,
    title: "Database integration",
    desc: "Built-in SQLite and PostgreSQL support with migrations. Query databases directly from loaders and server functions with prepared statements.",
  },
  {
    icon: ArrowRight,
    title: "Open source",
    desc: "MIT licensed. Contributions welcome. Built for Bun with modern JavaScript in mind. No lock-in, no proprietary formats.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Features</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Everything you need to build for the web
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          x combines static generation, server rendering, APIs, and server functions in a single Bun
          process — with zero configuration.
        </p>
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {allFeatures.map((f) => (
          <div key={f.title} className="bg-card p-8 transition-colors hover:bg-card/80">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-12 text-center sm:p-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to build with x?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One command, one process, everything you need.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/docs/getting-started"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/docs"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-medium text-foreground transition-all hover:bg-muted"
            >
              Read the docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
