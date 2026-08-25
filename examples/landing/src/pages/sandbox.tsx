import { TerminalBlock } from "../components/code-block";
import SandboxSlot from "../components/sandbox-slot";

export const mode = "static";

export default function SandboxPage() {
  return (
    <main className="mx-auto w-full max-w-container px-gutter pb-24 pt-14 sm:pt-20">
      <div className="max-w-2xl">
        <p className="label">Online sandbox</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,5.5vw,3.75rem)]">
          Run a real X project, right here.
        </h1>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-fg-muted">
          Nothing to install. The sandbox will run a full X starter in your browser with the editor,
          terminal, and preview wired together. It isn't live yet; the slot below is reserved for
          it.
        </p>
      </div>

      <div className="mt-10 max-w-2xl">
        <SandboxSlot />
      </div>

      <div className="mt-16 grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
        <div>
          <h2 className="display text-[clamp(1.8rem,3.5vw,2.4rem)]">
            Until then, it's one command.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-fg-muted">
            The same starter the sandbox will run is a single scaffold away. Everything boots in one
            Bun process.
          </p>
          <a href="/docs/installation" className="al-link mt-6 text-[15px]">
            Install X <span className="al-arrow">→</span>
          </a>
        </div>
        <TerminalBlock
          label="~/my-app · zsh"
          code={`$ bun create thexjs-app@latest my-app
  ✔ created my-app/
  ✔ 12 packages installed in 89ms

$ cd my-app && bun x dev
  [x] x dev server running at http://localhost:3000`}
        />
      </div>
    </main>
  );
}
