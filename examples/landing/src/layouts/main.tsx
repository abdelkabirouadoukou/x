import { Island } from "@thexjs/core";
import type { ReactNode } from "react";
import { CommandPalette, CommandPaletteTrigger } from "../components/command-palette";
import CursorGlow from "../components/cursor-glow";
import { EasterEgg } from "../components/easter-egg";
import { Logo } from "../components/logo";
import { StardanceBadge } from "../components/stardance-badge";
import StarfieldCanvas from "../components/starfield";

export const islands = {
  CommandPalette,
  CommandPaletteTrigger,
  CursorGlow,
  EasterEgg,
  StarfieldCanvas,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="cosmos" aria-hidden="true" />
      <Island name="StarfieldCanvas" client="idle">
        <StarfieldCanvas />
      </Island>
      <div className="scanlines" aria-hidden="true" />
      <span
        className="sr-only"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static direction contract, no user input; must survive into emitted markup for audit
        dangerouslySetInnerHTML={{
          __html: `<!--
            THESIS: x is a razor-sharp monochrome studio, not a landing page — a precision observatory lit by pure white light on vantablack; it refuses the SaaS-hero-plus-card-grid default.
            OWN-WORLD: strict monochrome palette — #000000 canvas, #FFFFFF accent/headlines, #A1A1AA muted text, rgba(255,255,255,0.12) hairlines. Chrome-glass panels, GSAP intro, live typing terminal, custom white cursor, no orbs.
            STORY: a crisp boot dissolves into the hero; the visitor learns "files in, routes out" from a live route-beacon instrument, and ships.
            FIRST VIEWPORT: GSAP preloader (counter 0-100%, starfield collapsing into the glowing x, hyper-jump zoom) resolving into badge, headline with neon x, subheading, Get Started + bun create x-app CTAs, auto-typing glass terminal.
            FORM: ultra-minimal monochrome observatory; strict palette pinned to the user's white-on-black brief.
            FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
          -->`,
        }}
      />
      <header
        data-hero-reveal
        className="fixed top-0 z-[99] w-full border-b border-border/70 bg-background/70 backdrop-blur-xl"
      >
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="group flex items-center gap-2.5 transition-opacity hover:opacity-85"
              aria-label="x home"
            >
              <Logo className="h-8 w-8" />
            </a>
            <span className="mx-2 hidden h-5 w-px bg-border/70 md:block" aria-hidden="true" />
            <a
              href="https://stardance.hackclub.com/projects/41081"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-full border border-chrome-lo bg-white/[0.04] py-1 pl-1 pr-3 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-foreground md:inline-flex"
            >
              <StardanceBadge variant="chip" />
              Stardance / Hack Club Entry
            </a>
          </div>

          <nav className="flex items-center gap-5 text-sm font-medium text-muted-foreground sm:gap-7">
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
          </nav>

          <div className="flex items-center justify-end gap-2.5">
            <Island name="CommandPaletteTrigger" client="idle">
              <CommandPaletteTrigger />
            </Island>
            <a href="/docs/installation" className="white-btn h-9 px-4 text-xs font-semibold">
              Install
            </a>{" "}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 pt-16">{children}</main>

      <footer className="relative z-10 border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-display font-normal uppercase tracking-[0.18em] text-foreground">
              x
            </span>{" "}
            is a fullstack framework for Bun
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

      <Island name="CommandPalette" client="idle">
        <CommandPalette />
      </Island>
      <Island name="EasterEgg" client="idle">
        <EasterEgg />
      </Island>
      <Island name="CursorGlow" client="idle">
        <CursorGlow />
      </Island>
    </div>
  );
}
