import type { ReactNode } from "react";
import { CommandPalette, CommandPaletteTrigger } from "../components/command-palette";
import { EasterEgg } from "../components/easter-egg";
import { Logo } from "../components/logo";
import { StardanceBadge } from "../components/stardance-badge";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 z-[99] w-full border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a
            href="/"
            className="group flex items-center gap-2.5 text-primary transition-opacity hover:opacity-80"
            aria-label="x home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
              <Logo className="h-4.5 w-4.5" />
            </span>
            <span className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
              x
            </span>
          </a>
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground sm:gap-6">
            <a href="/docs" className="transition-colors hover:text-foreground">
              Docs
            </a>
            <a href="/features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="/play" className="transition-colors hover:text-foreground">
              Play
            </a>
            <a
              href="https://github.com/abdelkabirouadoukou/x"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 transition-colors hover:text-foreground sm:flex"
            >
              GitHub
            </a>
            <CommandPaletteTrigger />
            <a
              href="/docs/installation"
              className="stamp-press inline-flex h-8 items-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Install
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-14">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-display font-semibold text-foreground">x</span> — fullstack
            framework for Bun
          </p>

          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
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
            <a
              href="https://stardance.hackclub.com/projects/41081"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              <StardanceBadge variant="chip" />
              Built solo for Hack Club Stardance
            </a>
          </div>
        </div>
      </footer>

      <CommandPalette />
      <EasterEgg />
    </div>
  );
}
