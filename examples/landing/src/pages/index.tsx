import { ArrowRight, BookOpen, Code2, FileJson, Globe, Layers, Shield, Zap } from "lucide-react";
import { CodeBlock } from "../components/code-block";

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
      {/* ── Hero ── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-16">
          <div className="h-[500px] w-[500px] animate-pulse-glow rounded-full bg-primary/20 sm:h-[700px] sm:w-[700px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight leading-[1.1] sm:text-7xl">
            Build anything.
            <br />
            <span className="text-primary">Ship anywhere.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
            A fullstack framework for Bun. Static sites, SSR, API routes, and server functions — all
            in one process.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/docs/getting-started"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-primary/40 active:scale-[0.97]"
            >
              Get Started{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="/docs"
              className="group inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card/50 px-6 text-sm font-medium text-foreground backdrop-blur-sm transition-all hover:bg-muted active:scale-[0.97]"
            >
              <BookOpen className="h-4 w-4" /> Read the Docs
            </a>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why x</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything in one place
          </h2>
          <p className="mt-4 text-muted-foreground">
            Most frameworks make you choose. x gives you everything — in one Bun process, zero
            config.
          </p>
        </div>
        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-card p-8 transition-colors hover:bg-card/80">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Terminal / Quick start ── */}
      <section className="mx-auto mt-32 max-w-4xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Quick start
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            One command to start
          </h2>
          <p className="mt-4 text-muted-foreground">
            Create a project, add a page, run the dev server. Two minutes, zero config.
          </p>
        </div>
        <CodeBlock
          label="~/project — bash"
          lang="bash"
          code={`mkdir my-app && cd my-app
bun create x@latest
  Creating a new x project...
  Done! 

cat > src/pages/index.tsx <<EOF
export default function Home() {
  return (
    <h1 className="text-3xl font-bold">Hello x!</h1>
  )
}
EOF
x dev
  compiling Tailwind CSS...
  dev server running at http://localhost:3000`}
        />
        <div className="mt-8 text-center">
          <a
            href="/docs/getting-started"
            className="group inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.97]"
          >
            Read the full guide{" "}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto mt-32 max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-primary/[0.03] to-background p-14 text-center sm:p-24">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to build?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              One command, one process, everything you need. Start building with x today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/docs"
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.97]"
              >
                <BookOpen className="h-4 w-4" /> Read the docs
              </a>
              <a
                href="https://github.com/anomalyco/x"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card/50 px-6 text-sm font-medium text-foreground backdrop-blur-sm transition-all hover:bg-muted active:scale-[0.97]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
