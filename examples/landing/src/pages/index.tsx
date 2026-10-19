import { Island } from "@thexjs/core";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import ApiTabs from "../components/api-tabs";
import Benchmarks from "../components/benchmarks";
import Choreo from "../components/choreo";
import CompareTable from "../components/compare-table";
import DotField from "../components/dot-field";
import HeroDemo from "../components/hero-demo";
import HeroName from "../components/hero-name";
import InstallCommand from "../components/install-command";
import SandboxSlot from "../components/sandbox-slot";
import Tour from "../components/tour";
import TryItNow from "../components/try-it-now";

export const islands = {
  Choreo,
  HeroName,
  DotField,
  InstallCommand,
  HeroDemo,
  Benchmarks,
  Tour,
  ApiTabs,
  CompareTable,
  TryItNow,
};

export const mode = "static";

/** Set before first paint so reveal states never flash; Choreo removes it on failure. */
const MOTION_GATE =
  "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')";

const MARQ_A = [
  "Bun runtime",
  "React 19 SSR",
  "Zero hydration tax",
  "Islands",
  "Typed server functions",
  "32ms cold start",
  "SQLite + Postgres",
];
const MARQ_B = [
  "File-tree router",
  "One process",
  "Built-in auth",
  "CSRF hardened",
  "Vercel adapter",
  "MCP server",
  "MIT licensed",
];

interface Tool {
  n: string;
  tag: string;
  title: string;
  copy: string;
  href: string;
  code: string;
}

const TOOLS: Tool[] = [
  {
    n: "01",
    tag: "routing",
    title: "File-based routing",
    copy: "Pages, loaders, API routes and server functions live in the file tree. The folder is the router.",
    href: "/docs/routing",
    code: "pages/index.tsx         -> /\npages/blog/[slug].tsx   -> /blog/:slug\npages/_404.tsx          -> catch-all 404",
  },
  {
    n: "02",
    tag: "islands",
    title: "Islands hydration",
    copy: "Pages ship as static HTML. Mark what hydrates and visitors download JavaScript only for those parts.",
    href: "/docs/islands",
    code: 'export const islands = { Counter };\n\n<Island name="Counter" client="visible">\n  <Counter />\n</Island>',
  },
  {
    n: "03",
    tag: "server functions",
    title: "Server functions",
    copy: "Import server code into client components. Typed, CSRF-safe, with no endpoint glue to write.",
    href: "/docs/server-functions",
    code: "// src/actions/greet.ts\nexport async function greet(name: string) {\n  return `Hello, ${name}!`;\n}",
  },
  {
    n: "04",
    tag: "data",
    title: "Data & migrations",
    copy: "SQLite and PostgreSQL with versioned migrations, straight from your loaders.",
    href: "/docs/data-layer",
    code: 'const db = connectSQLite({ path: "data/app.db" });\nawait runSQLiteMigrations(db, "data/migrations");',
  },
];

const STATS = [
  { pre: "", n: "20", post: "×", label: "faster cold start than Next.js (32ms vs 640ms)" },
  { pre: "", n: "92", post: "", label: "request count vs. server bundles in one process" },
  { pre: "HTTP/", n: "3", post: "", label: "behind the built-in production server" },
  { pre: "−", n: "4", post: "MB", label: "node_modules vs. a Next.js portable build" },
];

function Marquee({ items }: { items: string[] }) {
  const group = items.map((t) => (
    <span className="lp-marq-item" key={t}>
      {t}
    </span>
  ));
  return (
    <div className="lp-marq">
      <div className="lp-marq-group">{group}</div>
      <div className="lp-marq-group" aria-hidden="true">
        {group}
      </div>
    </div>
  );
}

function Eyebrow({ n, label, note }: { n: string; label: string; note?: string }) {
  return (
    <p className="lp-eyebrow" data-reveal>
      <span>
        <b>{n}</b> {label}
      </span>
      {note && <span className="lp-eyebrow-note">{note}</span>}
    </p>
  );
}

export default function HomePage() {
  return (
    <div className="lp">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, constant string */}
      <script dangerouslySetInnerHTML={{ __html: MOTION_GATE }} />
      <Island name="Choreo" client="load">
        <Choreo />
      </Island>

      {/* ---------------------------------------------------------------- Hero */}
      <section className="lp-hero" id="top" data-phase="0" aria-label="Introduction">
        <div className="lp-dots-wrap" aria-hidden="true">
          <Island name="DotField" client="idle">
            <DotField />
          </Island>
        </div>

        <div className="lp-wrap">
          <div className="lp-meta" data-reveal>
            <span className="lp-chip lp-chip-solid">
              <i /> v1.x stable
            </span>
            <span className="lp-chip">Bun-native</span>
            <span className="lp-chip">React 19</span>
            <span className="lp-chip">MIT</span>
          </div>

          <Island name="HeroName" client="load">
            <HeroName />
          </Island>

          <div className="lp-hero-grid">
            <div className="lp-hero-copy">
              <h1 className="lp-h1" data-lines>
                High-speed web apps with <em>X</em>.
              </h1>
              <p className="lp-lead" data-reveal>
                X is a fullstack React framework for Bun. Your folder structure is the router, your
                API lives beside your pages, and static pages, SSR and server functions all run in{" "}
                <strong>one process</strong>.
              </p>
              <div className="lp-install" data-reveal>
                <Island name="InstallCommand" client="idle">
                  <InstallCommand />
                </Island>
              </div>
              <div className="lp-cta" data-reveal>
                <span data-magnet>
                  <a href="/docs" className="lp-btn lp-btn-solid" data-cursor="docs">
                    Get started <ArrowRight className="h-4 w-4" />
                  </a>
                </span>
                <span data-magnet>
                  <a href="#toolkit" className="lp-btn lp-btn-line">
                    The toolkit
                  </a>
                </span>
                <a
                  href="https://github.com/abdelkabirouadoukou/x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-link"
                >
                  GitHub <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div className="lp-hero-demo" data-reveal>
              <Island name="HeroDemo" client="visible">
                <HeroDemo />
              </Island>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- Marquee */}
      <div className="lp-band dark" data-phase="0">
        <Marquee items={MARQ_A} />
        <Marquee items={MARQ_B} />
      </div>

      {/* ------------------------------------------------------------ Manifesto */}
      <section className="lp-sec lp-manifesto" data-phase="0" aria-labelledby="manifesto-h">
        <div className="lp-wrap">
          <Eyebrow n="01" label="Philosophy" note="one folder · one process" />
          <h2 id="manifesto-h" className="sr-only">
            Why X
          </h2>
          <p className="lp-manifesto-text" data-scrub>
            Your folder structure is the router. Your API lives beside your pages. Static pages, SSR
            and server functions share one Bun process, and only the islands you mark ever ship
            JavaScript.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- Rail (toolkit) */}
      <section className="lp-rail dark" id="toolkit" data-phase="1" aria-label="The toolkit">
        <div className="lp-track">
          <div className="lp-panel lp-intro">
            <p className="lp-eyebrow">
              <span>
                <b>02</b> The toolkit
              </span>
              <span className="lp-eyebrow-note">scroll →</span>
            </p>
            <h2 className="lp-h2">
              Four tools. <em>One</em> process.
            </h2>
            <p className="lp-lead">
              Routing, rendering, data and auth all speak the same file-tree language, so they
              compose without glue.
            </p>
          </div>

          {TOOLS.map((t) => (
            <a href={t.href} className="lp-panel lp-tool" key={t.n} data-cursor="read">
              <span className="lp-tool-ghost" aria-hidden="true">
                {t.n}
              </span>
              <span className="lp-tool-tag">{t.tag}</span>
              <h3>{t.title}</h3>
              <p>{t.copy}</p>
              <pre className="lp-code">
                <code>{t.code}</code>
              </pre>
              <span className="lp-tool-go">
                Read the docs <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          ))}
        </div>
        <div className="lp-meter" aria-hidden="true">
          <i />
        </div>
      </section>

      {/* ---------------------------------------------------------------- Stats */}
      <section className="lp-stats" data-phase="2" aria-label="Numbers">
        <div className="lp-wrap lp-stats-grid">
          {STATS.map((s) => (
            <div className="lp-stat" key={s.label} data-reveal>
              <p className="lp-stat-n">
                {s.pre}
                <span data-count={s.n}>{s.n}</span>
                {s.post}
              </p>
              <p className="lp-stat-l">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- Tour */}
      <section className="lp-sec" data-phase="2">
        <div className="lp-wrap">
          <Eyebrow n="03" label="A minute with X" />
          <h2 className="lp-h2" data-lines>
            From zero to a running app in <em>60 seconds</em>.
          </h2>
          <p className="lp-lead lp-sub" data-reveal>
            The tour plays through the five steps where a framework either earns its keep or
            doesn't: scaffolding, routes, APIs, data, and deploys. One terminal, no cuts.
          </p>
          <div className="lp-block" data-reveal>
            <Island name="Tour" client="visible">
              <Tour />
            </Island>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Speed */}
      <section className="lp-sec lp-tint" data-phase="3">
        <div className="lp-wrap lp-split">
          <div>
            <Eyebrow n="04" label="Speed" />
            <h2 className="lp-h2" data-lines>
              It's fast. Here's the <em>evidence</em>.
            </h2>
            <p className="lp-lead lp-sub" data-reveal>
              Every step below was measured against the same page source on the same machine. Change
              the tab, watch the bars.
            </p>
          </div>
          <div data-reveal>
            <Island name="Benchmarks" client="visible">
              <Benchmarks />
            </Island>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ API */}
      <section className="lp-sec" data-phase="3">
        <div className="lp-wrap">
          <Eyebrow n="05" label="Batteries included" />
          <h2 className="lp-h2" data-lines>
            Everything you need is <em>already there</em>.
          </h2>
          <p className="lp-lead lp-sub" data-reveal>
            Routes, data, auth, content and config each expose a small typed API that reads like the
            file it lives in.
          </p>
          <div className="lp-block" data-reveal>
            <Island name="ApiTabs" client="visible">
              <ApiTabs />
            </Island>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- Compare */}
      <section className="lp-sec lp-tint" data-phase="4">
        <div className="lp-wrap">
          <Eyebrow n="06" label="Compare" note="documented capabilities of each framework" />
          <h2 className="lp-h2" data-lines>
            How X <em>stacks up</em>.
          </h2>
          <div className="lp-block" data-reveal>
            <Island name="CompareTable" client="visible">
              <CompareTable />
            </Island>
          </div>
          <div className="lp-block" data-reveal>
            <SandboxSlot />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ CTA */}
      <section className="lp-cta-sec dark" data-phase="4" aria-label="Get started">
        <span className="lp-ghost lp-drift" aria-hidden="true">
          x
        </span>
        <Island name="TryItNow" client="visible">
          <TryItNow />
        </Island>
      </section>
    </div>
  );
}
