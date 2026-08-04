import { Island } from "@thexjs/core";
import { ArrowRight, BookOpen, FileJson, Globe, Layers, Shield, Sparkles, Zap } from "lucide-react";
import BootIntro from "../components/boot-intro";
import { TerminalBlock } from "../components/code-block";
import RouteResolver from "../components/route-resolver";
import RouteTrail from "../components/route-trail";
import ShipIt from "../components/ship-it";
import TypingTerminal from "../components/typing-terminal";

export const islands = { BootIntro, RouteResolver, RouteTrail, ShipIt, TypingTerminal };

const systems = [
  {
    id: "ROUTING",
    icon: FileJson,
    title: "File-based routing",
    desc: "Drop a file in src/pages, get a route. Nested folders, dynamic segments, and API routes are automatic.",
  },
  {
    id: "RENDER",
    icon: Layers,
    title: "Static + dynamic",
    desc: "Prerender marketing pages, SSR dashboards. Both on the same route, same process.",
  },
  {
    id: "API",
    icon: Globe,
    title: "API routes",
    desc: "REST endpoints beside your pages. Shared types, same process, no separate server.",
  },
  {
    id: "TYPES",
    icon: Shield,
    title: "Type safe",
    desc: "Loaders, params, and server functions stay typed end to end, from framework to component.",
  },
  {
    id: "ISLANDS",
    icon: Sparkles,
    title: "Islands",
    desc: "Interactive components hydrate in place. Only what you mark as an island loads client JS.",
  },
  {
    id: "POWER",
    icon: Zap,
    title: "One process",
    desc: "Static sites, SSR, API, and server functions run in one process. No microservices, no orchestration.",
  },
];

export const mode = "static";

export default function HomePage() {
  return (
    <div className="pb-32">
      <Island name="BootIntro" client="load">
        <BootIntro />
      </Island>

      <section className="relative overflow-hidden px-6 pb-28 pt-20 sm:pt-28">
        <Island name="RouteTrail" client="idle">
          <RouteTrail />
        </Island>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span data-hero-reveal className="pill-badge text-xs font-medium text-muted-foreground">
            Powered natively by the Bun runtime. Zero-config full-stack React.
          </span>

          <h1
            data-hero-reveal
            className="mt-8 text-[clamp(2.7rem,7.5vw,5.2rem)] font-bold leading-[1.02] tracking-tight text-foreground"
          >
            Build high-speed web apps with <span className="neon-text">x</span>
          </h1>

          <p
            data-hero-reveal
            className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            x is a React framework where your folder structure is the router, your API lives beside
            your pages, and everything runs in one Bun process, from static to server-rendered.
          </p>

          <div data-hero-reveal className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/docs/installation" className="white-btn h-12 px-7 text-sm font-semibold">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/docs/introduction" className="neon-btn h-12 px-6 font-mono text-sm">
              <BookOpen className="h-4 w-4" /> bun create x-app
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-4">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-normal uppercase leading-tight sm:text-4xl">
              <span className="chrome-text">Your file tree</span>
              <br />
              <span className="text-muted-foreground">is the route tree</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Type a file path and watch it resolve to a live route against the real server. That's
              the whole framework, in one console.
            </p>
          </div>
          <div>
            <Island name="RouteResolver" client="visible">
              <RouteResolver />
            </Island>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-10">
        <div className="glass rounded-3xl p-2 sm:p-3">
          <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-3">
            <h2 className="text-2xl font-normal uppercase tracking-tight sm:text-3xl">
              <span className="chrome-text">All systems go</span>
            </h2>
            <span className="console-label">
              <span className="go-dot" /> online
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {systems.map((s, i) => (
              <article
                key={s.id}
                className="group rounded-2xl border border-transparent p-5 transition-colors hover:border-chrome-lo hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] tracking-[0.22em] text-primary">
                    {s.id} / {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-go/70 shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-colors group-hover:bg-go" />
                </div>
                <h3 className="mt-3 flex items-center gap-2 text-base font-semibold">
                  <s.icon className="h-4 w-4 text-primary" />
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-normal uppercase leading-tight sm:text-4xl">
              <span className="chrome-text">One command</span>
              <br />
              <span className="text-muted-foreground">to a running server</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Scaffold, install, and run. No separate API service to wire up, no bundler config to
              tune before the first page renders.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="go-dot" />
              <span className="font-mono uppercase tracking-[0.18em]">countdown complete</span>
            </div>
          </div>
          <TerminalBlock
            label="~/my-app — zsh"
            code={`$ bun create thexjs-app@latest my-app

  Available templates:

    default  Blank slate, a single home page. (recommended)
    basic    Pages, API, auth, dashboard.
    blog     Markdown content collections.
    saas     Dashboard, pricing, data layer.

  Choose a template (default): █

$ cd my-app && bun run dev
  [x] dev server running at http://localhost:3000`}
          />
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <Island name="ShipIt" client="visible">
              <ShipIt />
            </Island>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-normal uppercase leading-tight sm:text-4xl">
              <span className="chrome-text">Reflexes</span>
              <br />
              <span className="text-muted-foreground">vs. a cold start</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Most stacks make you wait for the build. Start one, then ship the instant it's ready.
              See how close you can get to zero.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-4xl px-6">
        <div className="glass rounded-3xl px-8 py-14 text-center sm:px-14 sm:py-16">
          <div className="mx-auto mb-6 flex justify-center">
            <span className="beacon-ring flex h-14 w-14 items-center justify-center rounded-full border border-chrome-lo">
              <span className="relative flex h-2.5 w-2.5 rounded-full bg-go shadow-[0_0_18px_5px_rgba(255,255,255,0.35)]" />
            </span>
          </div>
          <h2 className="text-3xl font-normal uppercase tracking-tight sm:text-4xl">
            <span className="chrome-text">Ready to build?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Read the docs, scaffold a project, and ship from a single home page or a full-stack
            starter.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/docs" className="aqua-btn h-11 px-6 text-sm font-semibold">
              <BookOpen className="h-4 w-4" /> Read the docs
            </a>
            <a
              href="https://github.com/abdelkabirouadoukou/x"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-btn h-11 px-6 text-sm font-medium"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
