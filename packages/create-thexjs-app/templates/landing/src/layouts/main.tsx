import type { ReactNode } from "react";

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <title>x logo</title>
      <polygon points="3,5 5,3 21,19 19,21" fill="currentColor" />
      <polygon points="19,5 21,3 5,21 3,19" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 z-[99] w-full border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a
            href="/"
            className="group flex items-center gap-2.5 text-primary transition-opacity hover:opacity-90"
            aria-label="x home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
              <LogoMark />
            </span>
            <span className="font-display text-sm font-bold tracking-tight text-foreground/90">
              x
            </span>
          </a>
          <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="/docs" className="transition-colors hover:text-foreground">
              Docs
            </a>
            <a href="/features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a
              href="https://github.com/abdelkabirouadoukou/x"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 transition-colors hover:text-foreground sm:flex"
            >
              GitHub
            </a>
            <a
              href="/docs/installation"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Install
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1 pt-14">{children}</main>
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
          <p>
            <span className="font-display font-bold text-foreground">x</span> — fullstack framework
            for Bun
          </p>
          <div className="flex gap-5">
            <a href="/docs" className="transition-colors hover:text-foreground">
              Documentation
            </a>
            <a
              href="https://github.com/abdelkabirouadoukou/x"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
