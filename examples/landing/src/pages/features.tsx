import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Box,
  Boxes,
  Braces,
  Code2,
  FileJson,
  GitBranch,
  Globe,
  ImageIcon,
  Layers,
  MousePointerClick,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";

const allFeatures: {
  icon: typeof Zap;
  title: string;
  desc: string;
  href: string;
}[] = [
  {
    icon: Zap,
    title: "One process, everything included",
    desc: "Static sites, SSR, API routes, and server functions all run in a single Bun process. No microservices, no orchestration, no separate API server.",
    href: "/docs/introduction",
  },
  {
    icon: FileJson,
    title: "File-based routing",
    desc: "Your file tree is your route tree. Drop a page in src/pages/ and it's immediately available. Dynamic segments, nested routes, and catch-all 404s come for free.",
    href: "/docs/routing",
  },
  {
    icon: Layers,
    title: "Static + dynamic hybrid",
    desc: "Pick the right rendering mode per route. Use mode='static' for prerendered marketing pages, and server mode for personalized dashboards, all in the same project.",
    href: "/docs/pages",
  },
  {
    icon: Globe,
    title: "API routes built in",
    desc: "Build REST endpoints alongside your frontend. Shared types, same process, zero config. Middleware support for auth, validation, and logging.",
    href: "/docs/api-routes",
  },
  {
    icon: Server,
    title: "Server functions",
    desc: "Call server-side functions from the browser without writing REST endpoints. Import them into a client component and call them directly, or by hand with fetch.",
    href: "/docs/server-functions",
  },
  {
    icon: Braces,
    title: "Type safe end to end",
    desc: "TypeScript across the stack. Dynamic route params are inferred from file paths, server functions are fully typed, and client bundles stay type-checked against the same code.",
    href: "/docs/introduction",
  },
  {
    icon: ShieldCheck,
    title: "Production security",
    desc: "Build-time env isolation prevents secret leaks into client bundles. CSRF protection on server actions. Security headers (CSP, HSTS, X-Frame-Options) on every response. In-memory rate limiting, all on by default.",
    href: "/docs/security",
  },
  {
    icon: BarChart3,
    title: "Observability",
    desc: "Structured JSON logging, /healthz and /readyz probes for containers, and pluggable APM error tracing (Sentry + OpenTelemetry). Logs and probes work with no extra setup; tracing wires into whichever reporter you already run.",
    href: "/docs/observability",
  },
  {
    icon: BookOpen,
    title: "Content collections",
    desc: "Write markdown files with frontmatter and X turns them into pages. Built-in rendering with code highlighting, slug generation, and frontmatter parsing.",
    href: "/docs/content-collections",
  },
  {
    icon: Sparkles,
    title: "Live reload",
    desc: "Save a file and the dev server picks it up. It watches pages, layouts, API routes, and actions, so you never restart anything during development.",
    href: "/docs/getting-started",
  },
  {
    icon: Box,
    title: "Optimized production builds",
    desc: "One command produces static HTML, a server bundle, and a build manifest. Deploy anywhere Bun runs: Fly.io, Railway, Docker, or a VPS.",
    href: "/docs/build-deploy",
  },
  {
    icon: Code2,
    title: "Islands architecture",
    desc: "Interactive client components hydrate in place while the rest of the page stays static HTML. Users download JavaScript only for the parts of the page that actually need it.",
    href: "/docs/islands",
  },
  {
    icon: MousePointerClick,
    title: "Client-side navigation, by default",
    desc: "Every <a> tag already gets SPA-style transitions and hover prefetch, with no router setup. Opt out per-link with data-no-nav, or use the typed <Link> component.",
    href: "/docs/client-navigation",
  },
  {
    icon: ImageIcon,
    title: "Remote image proxy",
    desc: "Stream allow-listed remote images through your own origin at /_x/image. Keeps img-src 'self' in your CSP even with external image sources, with no client-side cross-origin requests.",
    href: "/docs/client-navigation",
  },
  {
    icon: RefreshCw,
    title: "Database integration",
    desc: "Built-in SQLite and PostgreSQL support with migrations. Query databases directly from loaders and server functions with prepared statements.",
    href: "/docs/data-layer",
  },
  {
    icon: Waves,
    title: "Streaming SSR",
    desc: "renderStreamingPage streams HTML to the client as it renders, so the first byte arrives before the full page is ready. Fast TTFB for slow data dependencies.",
    href: "/docs/pages",
  },
  {
    icon: Boxes,
    title: "Modular toolkit",
    desc: "Core, CLI, auth, env, hooks, and the Vercel adapter ship as separate packages, so a project only installs what it uses. Each one works on its own.",
    href: "/docs/packages/core",
  },
  {
    icon: GitBranch,
    title: "Open source",
    desc: "MIT licensed and developed in the open on GitHub. Standard React and TypeScript throughout; nothing proprietary to migrate away from later.",
    href: "https://github.com/abdelkabirouadoukou/x",
  },
];

export const mode = "static";

export default function FeaturesPage() {
  return (
    <div className="mx-auto w-full max-w-container px-gutter py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="label">Features</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,6vw,4rem)] leading-[0.92]">
          Everything you need to build for the web
        </h1>
        <p className="mt-5 max-w-[52ch] text-[15.5px] leading-relaxed text-fg-muted">
          X combines static generation, server rendering, APIs, and server functions in a single Bun
          process, with zero configuration.
        </p>
      </div>

      <div className="mt-16 border-t border-line">
        <div className="grid gap-px border-l border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {allFeatures.map((f, i) => (
            <a
              key={f.title}
              href={f.href}
              aria-label={`${f.title}: learn more`}
              className="group relative bg-canvas p-7 transition-colors hover:bg-subtle"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="label">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-code-bg text-accent transition-colors group-hover:border-accent/40">
                  <f.icon className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-fg">{f.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{f.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-fg">
                Details
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <div className="cut relative flex w-full flex-col items-center overflow-hidden border border-line-strong bg-fg px-8 py-14 text-center text-canvas sm:px-14 [--cut:14px]">
          <div className="mx-auto mb-6 flex justify-center">
            <span className="beacon-ring flex h-12 w-12 items-center justify-center rounded-full border border-white/15">
              <span className="relative flex h-2 w-2 rounded-full bg-accent" />
            </span>
          </div>
          <h2 className="display text-[clamp(2rem,4.5vw,3rem)] leading-[0.95]">
            Ready to build with X?
          </h2>
          <p className="mt-4 text-[15px] text-canvas/70">
            One command gets you a project with the whole stack already wired.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href="/docs/getting-started"
              className="cut btn-accent h-12 px-6 text-sm [--cut:8px]"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/docs"
              className="cut h-12 border border-canvas/25 px-6 text-sm font-medium text-canvas transition-colors hover:bg-canvas/10 [--cut:8px]"
            >
              Read the docs
            </a>
            <a
              href="/sandbox"
              className="cut h-12 border border-canvas/25 px-6 text-sm font-medium text-canvas transition-colors hover:bg-canvas/10 [--cut:8px]"
            >
              <Server className="h-4 w-4" /> Try the online sandbox
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
