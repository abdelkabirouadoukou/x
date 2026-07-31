import type { ReactNode } from "react";
import { highlight } from "../lib/syntax";

interface CodeBlockProps {
  label: string;
  code: string;
  lang?: string;
  /** Terminal-style output with prompt prefixes and scanline texture. */
  variant?: "code" | "terminal";
}

function TerminalBody({ code, lang }: { code: string; lang: string }) {
  const lines = code.split("\n");

  return (
    <div className="relative font-mono text-[13px] leading-[1.65]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
        }}
      />
      <pre className="relative overflow-x-auto p-5">
        {lines.map((line, i) => {
          const isPrompt = line.startsWith("$") || line.startsWith(">");
          const isOutput = line.startsWith("  ") && !line.startsWith("   ");
          const isDim = line.trim() === "" || line.includes("(recommended)");

          if (lang === "bash" && isPrompt) {
            const [, ...rest] = line.split(/(?<=\$|\>)\s?/);
            const cmd = rest.join("") || line.slice(1).trim();
            return (
              <div key={`${i}-${line.slice(0, 8)}`} className="flex gap-3">
                <span className="shrink-0 select-none text-[var(--terminal-prompt)]">
                  {line.startsWith("$") ? "$" : ">"}
                </span>
                <code className="text-[var(--terminal-text)]">{cmd}</code>
              </div>
            );
          }

          if (isOutput) {
            return (
              <div key={`${i}-${line.slice(0, 8)}`} className="pl-5 text-[var(--terminal-muted)]">
                {line.trimStart()}
              </div>
            );
          }

          return (
            <div
              key={`${i}-${line.slice(0, 8)}`}
              className={isDim ? "text-[var(--terminal-muted)]/80" : "text-[var(--terminal-text)]"}
            >
              {lang === "bash" ? line : highlight(line, lang)}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

export function CodeBlock({ label, code, lang = "tsx", variant = "code" }: CodeBlockProps) {
  const isTerminal = variant === "terminal" || lang === "bash" || lang === "tree";

  return (
    <div
      className="code-block mt-6 overflow-hidden rounded-2xl border shadow-xl"
      style={{
        borderColor: "var(--terminal-border)",
        backgroundColor: "var(--terminal-bg)",
        boxShadow: "var(--terminal-glow)",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{ borderColor: "var(--terminal-border)", backgroundColor: "var(--terminal-bar)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        </div>
        <span
          className="truncate font-mono text-[11px] tracking-wide"
          style={{ color: "var(--terminal-label)" }}
        >
          {label}
        </span>
        <span className="hidden w-12 sm:block" />
      </div>

      {isTerminal ? (
        <TerminalBody code={code} lang={lang} />
      ) : (
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono" style={{ color: "var(--terminal-text)" }}>
            {highlight(code, lang)}
          </code>
        </pre>
      )}
    </div>
  );
}

/** Shorthand for bash/CLI snippets. */
export function TerminalBlock({
  label,
  code,
}: {
  label: string;
  code: string;
}): ReactNode {
  return <CodeBlock label={label} code={code} lang="bash" variant="terminal" />;
}
