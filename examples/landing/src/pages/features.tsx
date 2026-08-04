import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Box,
  Code2,
  FileJson,
  Gamepad2,
  Globe,
  ImageIcon,
  Layers,
  MousePointerClick,
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
    desc: "Pick the right rendering mode per route. Use mode='static' for prerendered marketing pages, and server mode for personalized dashboards, all in the same project.",
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
    desc: "TypeScript across the stack. Dynamic route params are inferred from file paths, server functions are fully typed, and client bundles stay type-checked against the same code.",
  },
  {
    icon: Shield,
    title: "Production security",
    desc: "Build-time env isolation prevents secret leaks into client bundles. CSRF protection on server actions. Security headers (CSP, HSTS, X-Frame-Options) on every response. In-memory rate limiting, all on by default.",
  },
  {
    icon: BarChart3,
    title: "Observability",
    desc: "Structured JSON logging, /healthz and /readyz probes for containers, and pluggable APM error tracing (Sentry + OpenTelemetry). Production-ready out of the box.",
  },
  {
    icon: BookOpen,
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
    desc: "One command produces static HTML, a server bundle, and a build manifest. Deploy anywhere Bun runs: Fly.io, Railway, Docker, or a VPS.",
  },
  {
    icon: Code2,
    title: "Islands architecture",
    desc: "Interactive client components hydrate in place. The rest of the page is static HTML. Minimal JavaScript, maximum performance.",
  },
  {
    icon: MousePointerClick,
    title: "Client-side navigation, by default",
    desc: "Every <a> tag already gets SPA-style transitions and hover prefetch, with no router setup. Opt out per-link with data-no-nav, or use the typed <Link> component.",
  },
  {
    icon: ImageIcon,
    title: "Remote image proxy",
    desc: "Stream allow-listed remote images through your own origin at /_x/image. Keeps img-src 'self' in your CSP even with external image sources, with no client-side cross-origin requests.",
  },
  {
    icon: RefreshCw,
    title: "Database integration",
    desc: "Built-in SQLite and PostgreSQL support with migrations. Query databases directly from loaders and server functions with prepared statements.",
  },
  {
    icon: Gamepad2,
    title: "Learn by playing",
    desc: "The x Arcade turns routing, env isolation, and rendering modes into three tiny games. It's a different way in than reading docs top to bottom.",
  },
  {
    icon: ArrowRight,
    title: "Open source",
    desc: "MIT licensed. Contributions welcome. Built for Bun with modern JavaScript in mind. No lock-in, no proprietary formats.",
  },
];

export const mode = "static";

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-normal uppercase leading-tight tracking-tight sm:text-5xl">
          <span className="chrome-text">Everything you need</span>
          <br />
          <span className="text-muted-foreground">to build for the web</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          x combines static generation, server rendering, APIs, and server functions in a single Bun
          process, with zero configuration.
        </p>
      </div>

      <div className="glass mt-16 rounded-3xl p-2 sm:p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allFeatures.map((f, i) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-transparent p-7 transition-colors hover:border-chrome-lo hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] tracking-[0.22em] text-primary">
                  SYS / {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-chrome-lo bg-white/[0.05] text-primary">
                  <f.icon className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <div className="glass rounded-3xl px-8 py-12 text-center sm:px-14 sm:py-20">
          <div className="mx-auto mb-6 flex justify-center">
            <span className="beacon-ring flex h-12 w-12 items-center justify-center rounded-full border border-chrome-lo">
              <span className="relative flex h-2 w-2 rounded-full bg-go shadow-[0_0_18px_5px_rgba(255,255,255,0.35)]" />
            </span>
          </div>
          <h2 className="text-3xl font-normal uppercase leading-tight tracking-tight sm:text-4xl">
            <span className="chrome-text">Ready to build with x?</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One command, one process, everything you need.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="/docs/getting-started" className="aqua-btn h-12 px-6 text-sm font-semibold">
              Get started <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/docs" className="glass-btn h-12 px-6 text-sm font-medium">
              Read the docs
            </a>
            <a href="/play" className="glass-btn h-12 px-6 text-sm font-medium">
              <Gamepad2 className="h-4 w-4" /> Try the arcade
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
