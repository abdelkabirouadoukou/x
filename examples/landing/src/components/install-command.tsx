import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface OsCommand {
  id: string;
  label: string;
  prompt: string;
  command: string;
}

const COMMANDS: OsCommand[] = [
  {
    id: "bun",
    label: "bun",
    prompt: "$",
    command: "bun create thexjs-app@latest my-app",
  },
  {
    id: "npm",
    label: "npm",
    prompt: "$",
    command: "npm create thexjs-app@latest my-app",
  },
  {
    id: "pnpm",
    label: "pnpm",
    prompt: "$",
    command: "pnpm create thexjs-app@latest my-app",
  },
];

/**
 * Hero install command slab — a 56px near-black slab with a copy button and
 * a striped OS/target rail. Mirrors bun.sh's install shell; the command is
 * x's real scaffold command.
 */
export default function InstallCommand() {
  const [active, setActive] = useState(COMMANDS[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  const current = COMMANDS.find((c) => c.id === active) ?? (COMMANDS[0] as OsCommand);

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.command);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = current.command;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="w-full max-w-[36rem]">
      <div className="group/cmd cut cmd-slab relative flex h-[56px] items-stretch [--cut:10px]">
        <span className="readout flex select-none items-center pl-5 pr-3 text-[#70d6a3]">
          {current.prompt}
        </span>
        <code className="readout scroll-none flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap text-[15px] text-[#f2f2f0]">
          {current.command}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy command to clipboard"
          className="group/copy inline-flex w-14 shrink-0 items-center justify-center border-l border-canvas/20 text-canvas/70 transition-colors hover:bg-white/10 hover:text-canvas"
        >
          {copied ? <Check className="h-4 w-4 text-[#28dc82]" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <div role="tablist" className="inline-flex border p-px text-[12px] border-rule/60">
          {COMMANDS.map((c) => (
            <button
              key={c.id}
              role="tab"
              type="button"
              aria-selected={active === c.id}
              onClick={() => setActive(c.id)}
              className={`px-2.5 py-[3px] transition-colors ${
                active === c.id
                  ? "bg-fg text-on-slab"
                  : "text-fg-muted hover:bg-subtle hover:text-fg"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <a
          href="/docs/installation"
          className="ml-auto text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          View install docs ↗
        </a>
      </div>
    </div>
  );
}
