import type { ReactNode } from "react";
import { highlight } from "../lib/syntax";

interface CodeBlockProps {
  label: string;
  code: string;
  lang?: string;
}

export function CodeBlock({ label, code, lang = "tsx" }: CodeBlockProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-[#0d1117] shadow-lg">
      <div className="flex items-center gap-1.5 border-b border-white/5 bg-[#161b22] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-2 text-xs text-[#8b949e]">{label}</span>
      </div>
      <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
        <code className="font-mono text-[#e6edf3]">{highlight(code, lang)}</code>
      </pre>
    </div>
  );
}
