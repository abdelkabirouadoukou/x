import { ChevronDown, PauseCircle, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";

interface TourLine {
  kind: "prompt" | "out" | "ok" | "dim";
  text: string;
}

interface TourStep {
  num: string;
  title: string;
  command: string;
  description: string;
  docs: string;
  lines: TourLine[];
}

const STEPS: TourStep[] = [
  {
    num: "01",
    title: "Create a project",
    command: "$ bun create thexjs-app@latest",
    description:
      "Scaffold a blank slate, blog, or SaaS starter. Templates generate package.json, resolve the latest packages, and run bun install for you.",
    docs: "/docs/installation",
    lines: [
      { kind: "prompt", text: "bun create thexjs-app@latest my-app" },
      { kind: "out", text: "bun create v1.3.1" },
      { kind: "dim", text: "✔ created my-app/" },
      { kind: "dim", text: "  ├─ src/pages/index.tsx" },
      { kind: "dim", text: "  ├─ src/api/hello.ts" },
      { kind: "dim", text: "  └─ package.json" },
      { kind: "ok", text: "+ 12 packages installed" },
    ],
  },
  {
    num: "02",
    title: "Add a route by writing a file",
    command: "$ mkdir -p src/pages/about && touch src/pages/about/index.tsx",
    description:
      "Your file tree is the route tree. Drop a page in src/pages and it's immediately a URL. Nested folders, dynamic segments, and 404s included.",
    docs: "/docs/routing",
    lines: [
      { kind: "prompt", text: "code src/pages/about/index.tsx" },
      { kind: "out", text: "// about/index.tsx" },
      { kind: "dim", text: "export const mode = 'static';" },
      { kind: "dim", text: "export default function About() {" },
      { kind: "dim", text: "  return <main>About x</main>;" },
      { kind: "dim", text: "}" },
      { kind: "ok", text: "/about ✓ rendered" },
    ],
  },
  {
    num: "03",
    title: "Add an API route",
    command: "$ touch src/api/hello.ts",
    description:
      "REST endpoints live beside your pages and share the request lifecycle and the process. There is no separate API server to stand up.",
    docs: "/docs/api-routes",
    lines: [
      { kind: "prompt", text: "code src/api/hello.ts" },
      { kind: "dim", text: "export const GET = () => Response.json({ hello: 'x' });" },
      { kind: "ok", text: "GET /api/hello ✓ 200" },
      { kind: "dim", text: "content-type: application/json" },
    ],
  },
  {
    num: "04",
    title: "Call the server from the browser",
    command: "$ touch src/actions.ts",
    description:
      "Import server functions directly into client components. Fully typed calls, no REST boilerplate, CSRF-protected by default.",
    docs: "/docs/server-functions",
    lines: [
      { kind: "prompt", text: "code src/actions.ts" },
      { kind: "dim", text: "export async function getPosts() {" },
      { kind: "dim", text: "  return db.query('select * from posts');" },
      { kind: "dim", text: "}" },
      { kind: "dim", text: "// client component" },
      { kind: "out", text: "import { getPosts } from '../actions';" },
      { kind: "ok", text: "✓ 6 posts hydrated" },
    ],
  },
  {
    num: "05",
    title: "Build & ship",
    command: "$ bun x build",
    description:
      "One command produces static HTML, a server bundle, and a build manifest. Deploy to Vercel, Fly.io, Railway, Docker, or a VPS.",
    docs: "/docs/build-deploy",
    lines: [
      { kind: "prompt", text: "bun x build" },
      { kind: "dim", text: "  ✓ static /  -> dist/static/index.html" },
      { kind: "dim", text: "  ✓ server /  -> dist/server/index.js" },
      { kind: "dim", text: "  ✓ api    /  -> dist/server/api/hello.ts" },
      { kind: "dim", text: "  ✓ 2 islands -> dist/client/_islands/" },
      { kind: "ok", text: "✔ build complete" },
    ],
  },
];

function TourLine({ line }: { line: TourLine }) {
  if (line.kind === "prompt")
    return (
      <span className="block">
        <span className="select-none text-[#70d6a3]">$ </span>
        <span className="text-[#f2f2f0]">{line.text}</span>
      </span>
    );
  if (line.kind === "ok") return <span className="block text-[#28dc82]">{line.text}</span>;
  if (line.kind === "dim") return <span className="block text-[#8b8b92]">{line.text}</span>;
  return <span className="block text-[#cfcfd4]">{line.text}</span>;
}

/**
 * Tour — "A minute with X". Five vertical steps on the left, a dark terminal
 * window on the right that plays each step's output with prev/next/replay.
 */
export default function Tour() {
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(0);
  const [playing, setPlaying] = useState(true);
  const step = STEPS[active] ?? (STEPS[0] as TourStep);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => {
        if (count < step.lines.length - 1) setCount((c) => c + 1);
        else setPlaying(false);
      },
      count === 0 ? 450 : 320,
    );
    return () => window.clearTimeout(timer);
  }, [count, playing, step]);

  function go(to: number) {
    setActive(to);
    setCount(0);
    setPlaying(true);
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-16">
      <div>
        <ol className="flex flex-col border-y border-line lg:border-0">
          {STEPS.map((s, i) => {
            const isActive = i === active;
            return (
              <li key={s.num}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => go(i)}
                  className={`group/step relative grid w-full grid-cols-[2.25rem_1fr] gap-3 px-1 py-3.5 text-left transition-colors lg:rounded-lg lg:px-3 lg:py-4 ${
                    isActive ? "lg:bg-subtle" : ""
                  }`}
                >
                  <span
                    className={`mono pt-0.5 text-[11px] tabular-nums ${
                      isActive ? "text-fg" : "text-fg-faint lg:group-hover/step:text-fg"
                    }`}
                  >
                    {s.num}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[15px] font-medium transition-colors ${
                        isActive
                          ? "text-fg"
                          : "text-fg lg:text-fg-muted lg:group-hover/step:text-fg"
                      }`}
                    >
                      {s.title}
                    </span>
                    <code className="mt-0.5 block truncate text-[12.5px] text-fg-muted">
                      {s.command}
                    </code>
                    <span
                      className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <span className="min-h-0">
                        <span className="mt-2 block text-[14px] leading-relaxed text-fg-muted">
                          {s.description}{" "}
                          <a
                            href={s.docs}
                            className="text-[13px] font-medium text-fg underline underline-offset-4 hover:text-accent"
                          >
                            Docs
                          </a>
                        </span>
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={
                      "absolute right-2 top-4 h-3.5 w-3.5 transition-transform lg:hidden " +
                      (isActive ? "rotate-180" : "")
                    }
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div>
        <div className="terminal-slab">
          <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
            <span className="traffic" />
            <span className="traffic" />
            <span className="traffic" />
            <span className="ml-3 font-mono text-[11.5px] text-white/40">~/my-app · bun</span>
            <span className="ml-auto font-mono text-[11px] text-white/30">
              {String(active + 1).padStart(2, "0")} / 05
            </span>
          </div>
          <pre className="m-0 min-h-[22.5rem] overflow-hidden whitespace-pre-wrap break-words px-5 py-4 font-mono text-[13px] leading-[1.7]">
            {step.lines.slice(0, count + 1).map((line) => (
              <TourLine key={line.text} line={line} />
            ))}
            {playing && (
              <span className="animate-blink inline-block h-[1.05em] w-[0.55em] bg-white/70 align-text-bottom" />
            )}
          </pre>
        </div>

        <div className="mt-3 flex items-center justify-between text-[12px] text-fg-faint">
          <span>Hover the script, replay any step.</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => go(Math.max(0, active - 1))}
              aria-label="Previous step"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line transition-colors hover:bg-subtle hover:text-fg"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => go(active)}
              aria-label="Replay step output"
              className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 transition-colors hover:bg-subtle hover:text-fg"
            >
              {playing ? <PauseCircle className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{playing ? "playing" : "replay"}</span>
            </button>
            <button
              type="button"
              onClick={() => go(Math.min(STEPS.length - 1, active + 1))}
              aria-label="Next step"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line transition-colors hover:bg-subtle hover:text-fg"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
