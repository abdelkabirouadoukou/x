import { ArrowRight, BookOpen, FileJson, Globe, Layers, Shield, Sparkles, Zap } from "lucide-react";
import { TerminalBlock } from "../components/code-block";
import RouteResolver from "../components/route-resolver";
import ShipIt from "../components/ship-it";
import { StardanceBadge } from "../components/stardance-badge";

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
    icon: Sparkles,
    title: "Island architecture",
    desc: "Interactive components hydrate in place. Minimal client JS — only what you mark as an island loads.",
  },
];

export const mode = "static";

export default function HomePage() {
  return (
    <div className="pb-32">
      <section className="route-grid relative overflow-hidden px-6 pt-16 pb-20 sm:pt-20">
        <div className="relative z-10 mx-auto grid max-w-6xl items-start gap-14 lg:grid-cols-[1fr_1fr] lg:gap-10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
              Bun-native fullstack
            </p>
            <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.1rem)] font-bold uppercase leading-[1.04]">
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
                className="group inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                Install x
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="/docs/introduction"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <BookOpen className="h-4 w-4" /> Introduction
              </a>
            </div>
            <a
              href="https://stardance.hackclub.com/projects/41081"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <StardanceBadge variant="inline" />
              Built solo, age 18, for Hack Club Stardance
            </a>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Try it — type a file path
            </p>
            <div className="mt-3">
              <RouteResolver />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Why x</p>
          <h2 className="mt-4 text-3xl font-bold uppercase sm:text-4xl">
            Everything in one place
          </h2>
          <p className="mt-4 text-muted-foreground">
            Most frameworks split the stack. x keeps routing, rendering, API, and build tooling in
            one runtime.
          </p>
        </div>
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                <f.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
              Zero config
            </p>
            <h2 className="mt-4 text-3xl font-bold uppercase sm:text-4xl">
              One command to a running server
            </h2>
            <p className="mt-4 text-muted-foreground">
              Scaffold, install, and run. No separate API service to wire up, no bundler config to
              tune before the first page renders.
            </p>
          </div>
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
      </section>

      <section className="mx-auto mt-28 max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <ShipIt />
          </div>
          <div className="order-1 lg:order-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
              Deploy speed
            </p>
            <h2 className="mt-4 text-3xl font-bold uppercase sm:text-4xl">
              Reflexes vs. a cold start
            </h2>
            <p className="mt-4 text-muted-foreground">
              Most stacks make you wait for the build. Start one, then ship the instant it's
              ready — see how close you can get to zero.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-6xl px-6">
        <a
          href="/play"
          className="ticket-card group relative block overflow-hidden rounded-3xl border border-border bg-card px-8 py-10 text-center transition-colors hover:border-primary/40 sm:px-16 sm:py-14"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            Learn by playing
          </p>
          <h2 className="mt-4 text-3xl font-bold uppercase sm:text-4xl">The x Arcade</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Three tiny games that only make sense once you know how the framework thinks: route
            matching, the client/server boundary, and static vs. server rendering.
          </p>
          <span className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all group-hover:bg-primary/90">
            Open the arcade
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </a>
      </section>

      <section className="mx-auto mt-28 max-w-4xl px-6">
        <div className="rounded-3xl border border-border bg-card p-10 text-center sm:p-14">
          <h2 className="text-3xl font-bold uppercase sm:text-4xl">Ready to build?</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Read the docs, scaffold a project, and ship from a single home page or a full-stack
            starter.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/docs"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
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
