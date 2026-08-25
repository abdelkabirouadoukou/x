import { Play } from "lucide-react";
import { useEffect, useState } from "react";

interface ScriptLine {
  kind: "prompt" | "out" | "ok" | "dim";
  text: string;
}

interface Script {
  id: string;
  title: string;
  tab: string;
  caption: string;
  lines: ScriptLine[];
  result: string;
}

const SCRIPTS: Script[] = [
  {
    id: "quickstart",
    title: "Scaffold a project",
    tab: "Scaffold",
    caption: "bun create thexjs-app downloads the template and resolves deps in one command.",
    result: "bun create thexjs-app@latest",
    lines: [
      { kind: "prompt", text: "bun create thexjs-app@latest my-app" },
      { kind: "out", text: "Downloading create-thexjs-app..." },
      { kind: "dim", text: "✔ created my-app/" },
      { kind: "dim", text: "  ├─ src/pages/index.tsx" },
      { kind: "dim", text: "  ├─ src/api/hello.ts" },
      { kind: "dim", text: "  └─ package.json" },
      { kind: "out", text: "Installing dependencies..." },
      { kind: "ok", text: "✔ 12 packages installed" },
      { kind: "dim", text: "Next: cd my-app && bun x dev" },
    ],
  },
  {
    id: "dev",
    title: "Run the dev server",
    tab: "Dev server",
    caption: "Pages, API routes, and server functions all boot in a single Bun process.",
    result: "bun x dev",
    lines: [
      { kind: "prompt", text: "cd my-app && bun x dev" },
      { kind: "out", text: "Starting x dev server..." },
      { kind: "ok", text: "✔  x dev server running at http://localhost:3000" },
      { kind: "dim", text: "  [x] static  /            index.tsx" },
      { kind: "dim", text: "  [x] api     /hello       api/hello.ts" },
      { kind: "dim", text: "  [x] islands hello-button island.tsx" },
      { kind: "out", text: "  ✓ watching src/ ..." },
      { kind: "ok", text: "✔ live reload ready" },
    ],
  },
  {
    id: "build",
    title: "Build & deploy",
    tab: "Build & deploy",
    caption: "One command produces static HTML, a server bundle, and a build manifest.",
    result: "bun x build",
    lines: [
      { kind: "prompt", text: "bun x build" },
      { kind: "dim", text: "  ✓ static /  -> dist/static/index.html" },
      { kind: "dim", text: "  ✓ server /  -> dist/server/index.js" },
      { kind: "dim", text: "  ✓ api    /  -> dist/server/api/hello.ts" },
      { kind: "out", text: "  ✓ 2 islands -> dist/client/_islands/" },
      { kind: "ok", text: "✔ build complete in 214ms" },
    ],
  },
];

function Line({ line }: { line: ScriptLine }) {
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
 * Hero right panel — dark terminal slab with a tab rail and single line of
 * live output, plus replay. Mirrors bun.sh's benchmark-panel anatomy (tab
 * grid + replay), showing classic x command output instead of benchmarks.
 */
export default function HeroDemo() {
  const [active, setActive] = useState(SCRIPTS[0]?.id ?? "");
  const [count, setCount] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const script = SCRIPTS.find((s) => s.id === active) ?? (SCRIPTS[0] as Script);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        if (count < script.lines.length - 1) {
          setCount((c) => c + 1);
        } else {
          setShowCursor(false);
        }
      },
      count === 0 ? 600 : 260,
    );
    return () => window.clearTimeout(timer);
  }, [count, script]);

  function selectTab(id: string) {
    setActive(id);
    setCount(0);
    setShowCursor(true);
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="relative border-l border-t border-rule">
        <div className="grid grid-cols-[repeat(3,auto)] overflow-x-auto scroll-none">
          {SCRIPTS.map((s) => (
            <button
              key={s.id}
              role="tab"
              type="button"
              aria-selected={active === s.id}
              onClick={() => selectTab(s.id)}
              className={`relative flex min-w-0 items-center justify-center whitespace-nowrap border-b border-r border-rule px-2.5 py-3 text-[12.5px] font-semibold sm:px-3 sm:text-[13px] transition-colors ${
                active === s.id
                  ? "bg-slab text-on-slab"
                  : "text-fg-muted hover:bg-subtle hover:text-fg"
              }`}
            >
              {s.tab}
            </button>
          ))}
        </div>

        <div className="border-x border-b border-rule bg-canvas">
          <div className="px-5 pb-2 pt-5 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-[1.05rem] font-bold tracking-[-0.01em] text-fg">
                  {script.title}
                </h2>
                <p className="m-0 mt-0.5 text-[13px] leading-snug text-fg-muted">
                  {script.caption}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCount(0)}
                aria-label="Replay output"
                className="group/race inline-flex shrink-0 items-center gap-1.5 text-[12.5px] text-fg-muted hover:text-fg"
              >
                <Play className="h-2.5 w-2.5 text-accent transition-transform group-hover/race:scale-110" />
                <span>replay</span>
              </button>
            </div>
          </div>

          <div className="terminal-slab border-x-0 border-b-0 rounded-none">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
              <span className="traffic" />
              <span className="traffic" />
              <span className="traffic" />
              <span className="ml-3 font-mono text-[11px] text-white/40">{script.result}</span>
            </div>
            <pre className="m-0 min-h-[16rem] overflow-hidden whitespace-pre-wrap break-words px-5 py-4 font-mono text-[13px] leading-[1.7]">
              {script.lines.slice(0, count + 1).map((line) => (
                <Line key={line.text} line={line} />
              ))}
              {showCursor && (
                <span className="animate-blink inline-block h-[1.05em] w-[0.55em] bg-white/70 align-text-bottom" />
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
