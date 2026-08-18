import { PlayCircle } from "lucide-react";

/**
 * Online sandbox — reserved slot for the user's upcoming in-browser test
 * runner. Header + body panel that reads like the rest of the page; the
 * consumer only has to replace the inner content to wire in the real sandbox.
 */
export default function SandboxSlot() {
  return (
    <div
      id="sandbox"
      data-sandbox
      className="relative w-full overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-code-bg text-accent">
            <PlayCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="label">Try it online</p>
            <h3 className="mt-1 text-[1.05rem] font-semibold tracking-tight text-fg">
              Test X in your browser
            </h3>
          </div>
        </div>
        <span className="cut bg-subtle px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-faint [--cut:5px]">
          Sandbox coming soon
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8">
        <p className="max-w-[54ch] text-[14.5px] leading-relaxed text-fg-muted">
          The online sandbox lands here — a starter window where you can run a real X project without
          installing anything.
        </p>
        <a href="/docs/getting-started" className="al-link text-[14px]">
          Scaffold locally <span className="al-arrow">→</span>
        </a>
      </div>
    </div>
  );
}