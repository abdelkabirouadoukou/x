import { Check, Copy } from "lucide-react";
import type { ReactNode } from "react";
import { highlight } from "../lib/syntax";

interface CodeBlockProps {
  label: string;
  code: string;
  lang?: string;
  /** terminal slab (dark) vs light code panel */
  variant?: "code" | "terminal";
  glass?: boolean;
}

function TerminalBody({ code }: { code: string }) {
  const lines = code.split("\n");

  return (
    <div className="relative font-mono text-[13px] leading-[1.7] text-[#f2f2f0]">
      <pre className="relative overflow-x-auto p-5">
        {lines.map((line, i) => {
          const isPrompt = line.startsWith("$") || line.startsWith(">");
          const isOutput = line.startsWith("  ") && !line.startsWith("   ");
          const isDim = line.trim() === "";

          if (isPrompt) {
            const [, ...rest] = line.split(/(?<=\$|>)\s?/);
            const cmd = rest.join("") || line.slice(1).trim();
            return (
              <div key={`${i}-${line.slice(0, 8)}`} className="flex gap-3">
                <span className="shrink-0 select-none text-[#70d6a3]">
                  {line.startsWith("$") ? "$" : ">"}
                </span>
                <code className="text-[#f2f2f0]">{cmd}</code>
              </div>
            );
          }

          if (isOutput) {
            return (
              <div key={`${i}-${line.slice(0, 8)}`} className="pl-5 text-[#9a9aa0]">
                {line.trimStart()}
              </div>
            );
          }

          return (
            <div
              key={`${i}-${line.slice(0, 8)}`}
              className={isDim ? "text-[#9a9aa0]/70" : "text-[#f2f2f0]"}
            >
              {line}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

function CopyButton({ code }: { code: string }) {
  const id = `copy-${code.slice(0, 24).replace(/\W/g, "-")}`;
  return (
    <button
      data-copy
      data-copy-target={`#${id}`}
      type="button"
      aria-label="Copy code"
      className="group/copy inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-fg/[0.06] hover:text-fg"
    >
      <span data-copy-icon className="hidden h-4 w-4 group-hover/copy:block">
        <Copy className="h-4 w-4" />
      </span>
      <span className="hidden h-4 w-4 text-success" data-copy-ok>
        <Check className="h-4 w-4" />
      </span>
    </button>
  );
}

export function CodeBlock({
  label,
  code,
  lang = "tsx",
  variant = "code",
  glass = false,
}: CodeBlockProps) {
  const isTerminal = variant === "terminal" || lang === "bash" || lang === "tree";

  if (isTerminal) {
    return (
      <div
        className={glass ? "terminal-slab" : "terminal-slab mt-6"}
        style={glass ? { marginTop: 0 } : undefined}
      >
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
          <span className="traffic" />
          <span className="traffic" />
          <span className="traffic" />
          <span className="ml-3 font-mono text-[11.5px] text-white/40">{label}</span>
        </div>
        <TerminalBody code={code} />
      </div>
    );
  }

  const id = `c-${code.slice(0, 24).replace(/\W/g, "-")}`;

  return (
    <div className={`CodeBlock ${glass ? "" : "border border-line"}`}>
      <div className="CodeBlockTab">
        <span>{label}</span>
        <span className="ml-auto">
          <CopyButton code={code} />
        </span>
      </div>
      <pre className="shiki" id={id}>
        <code>{highlight(code, lang)}</code>
      </pre>
    </div>
  );
}

/** Shorthand for bash/CLI snippets (dark terminal slab). */
export function TerminalBlock({
  label,
  code,
  glass = false,
}: {
  label: string;
  code: string;
  glass?: boolean;
}): ReactNode {
  return <CodeBlock label={label} code={code} lang="bash" variant="terminal" glass={glass} />;
}
