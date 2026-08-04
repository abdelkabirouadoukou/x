import type { ReactNode } from "react";
import { highlight } from "../lib/syntax";

interface CodeBlockProps {
  label: string;
  code: string;
  lang?: string;
  /** Terminal-style output with prompt prefixes and scanline texture. */
  variant?: "code" | "terminal";
  /** Glassmorphism window — translucent, blurred, floating in the sky. */
  glass?: boolean;
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

export function CodeBlock({
  label,
  code,
  lang = "tsx",
  variant = "code",
  glass = false,
}: CodeBlockProps) {
  const isTerminal = variant === "terminal" || lang === "bash" || lang === "tree";

  return (
    <div
      className={`code-block overflow-hidden rounded-2xl ${glass ? "code-block-glass" : "mt-6"}`}
      style={
        glass
          ? undefined
          : {
              border: "1px solid var(--terminal-border)",
              backgroundColor: "var(--terminal-bg)",
              boxShadow: "var(--terminal-glow)",
            }
      }
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
        style={
          glass
            ? { borderColor: "rgba(255,255,255,0.1)" }
            : {
                borderColor: "var(--terminal-border)",
                backgroundColor: "var(--terminal-bar)",
              }
        }
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#71717a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#52525b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#3f3f46]" />
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
  glass = false,
}: {
  label: string;
  code: string;
  glass?: boolean;
}): ReactNode {
  return <CodeBlock label={label} code={code} lang="bash" variant="terminal" glass={glass} />;
}
