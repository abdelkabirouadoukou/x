import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1c2433 1px, transparent 1px), linear-gradient(to bottom, #1c2433 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 100%)",
        }}
      />
      <header className="relative z-10 flex h-16 items-center px-6 sm:px-10">
        <a href="/" className="group flex items-center gap-2.5" aria-label="Home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-primary"
              fill="none"
              aria-hidden="true"
            >
              <title>x</title>
              <polygon points="3,5 5,3 21,19 19,21" fill="currentColor" />
              <polygon points="19,5 21,3 5,21 3,19" fill="currentColor" opacity="0.45" />
            </svg>
          </span>
        </a>
      </header>
      <main className="relative z-10 flex flex-1 flex-col">{children}</main>
    </div>
  );
}
