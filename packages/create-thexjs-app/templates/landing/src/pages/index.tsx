import { ArrowRight, BookOpen, Code2, FileJson, Globe, Layers, Shield, Zap } from "lucide-react";
import { TerminalBlock } from "../components/code-block";

const features = [
  {
    icon: Zap,
    title: "One process",
    desc: "Static sites, SSR, API routes, and server functions — no microservices, no orchestration.",
  },
  {
    icon: FileJson,
    title: "File-based routing",
    desc: "Drop a file in src/pages, get a route. Nested folders, dynamic segments, API routes — automatic.",
  },
  {
    icon: Layers,
    title: "Static + dynamic",
    desc: "Mix static generation with SSR on the same route. Prerender marketing pages, SSR dashboards and admin.",
  },
  {
    icon: Globe,
    title: "API routes",
    desc: "Build REST endpoints alongside your pages. Shared types, same process, no separate server needed.",
  },
  {
    icon: Shield,
    title: "Type safe",
    desc: "End-to-end TypeScript. Loaders, params, server functions — all typed from the framework to your components.",
  },
  {
    icon: Code2,
    title: "Island architecture",
    desc: "Interactive components hydrate in place. Minimal client JS — only what you mark as an island loads.",
  },
];

export const mode = "static";

export default function HomePage() {
  return (
    <div className="pb-32">
      <section className="relative overflow-hidden px-6 pt-16 pb-24 sm:pt-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, #1a2233 1px, transparent 1px), linear-gradient(to bottom, #1a2233 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 10%, transparent 100%)",
          }}
        />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 animate-pulse-glow rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
              Bun-native fullstack
            </p>
            <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[1.02]">
              Files in.
              <br />
              <span className="text-primary">Routes out.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              x is a React framework where your folder structure is the router, your API lives
              beside your pages, and everything runs in one Bun process.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="/docs/installation"
                className="group inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                Install x
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="/docs/introduction"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card/60 px-5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-muted"
              >
                <BookOpen className="h-4 w-4" /> Introduction
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 blur-2xl" />
            <TerminalBlock
              label="~/my-app — zsh"
              code={`$ bun create thexjs-app@latest my-app

  Available templates:

    default  Blank slate — single home page. (recommended)
    basic    Pages, API, auth, dashboard.
    blog     Markdown content collections.
    saas     Dashboard, pricing, data layer.

  Choose a template (default): █

$ cd my-app && bun run dev
  [x] dev server running at http://localhost:3000`}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Why x</p>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Everything in one place</h2>
          <p className="mt-4 text-muted-foreground">
            Most frameworks split the stack. x keeps routing, rendering, API, and build tooling in
            one runtime.
          </p>
        </div>
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="group rounded-2xl border border-border/80 bg-card/50 p-6 transition-colors hover:border-primary/25 hover:bg-card"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                <f.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-4xl px-6">
        <div className="rounded-3xl border border-border/80 bg-card/40 p-10 text-center sm:p-14">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to build?</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Read the docs, scaffold a project, and ship from a single home page or a full-stack
            starter.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/docs"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
            >
              <BookOpen className="h-4 w-4" /> Read the docs
            </a>
            <a
              href="https://github.com/abdelkabirouadoukou/x"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-medium transition-colors hover:bg-muted"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
