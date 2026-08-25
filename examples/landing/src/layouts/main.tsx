import { Island } from "@thexjs/core";
import { GitBranch, Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import DocsSearch from "../components/docs-search";
import { Logo } from "../components/logo";

const NAV = [
  { href: "/docs", label: "Docs" },
  { href: "/features", label: "Features" },
  { href: "/sandbox", label: "Sandbox" },
];

const FOOTER_COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/docs/introduction", label: "Introduction" },
      { href: "/features", label: "Features" },
      { href: "/docs/installation", label: "Installation" },
      { href: "/sandbox", label: "Online sandbox" },
    ],
  },
  {
    title: "Toolkit",
    links: [
      { href: "/docs/packages/core", label: "@thexjs/core" },
      { href: "/docs/packages/cli", label: "@thexjs/cli" },
      { href: "/docs/packages/auth", label: "@thexjs/auth" },
      { href: "/docs/packages/env", label: "@thexjs/env" },
      { href: "/docs/packages/hooks", label: "@thexjs/hooks" },
      { href: "/docs/packages/adapter-vercel", label: "@thexjs/adapter-vercel" },
      { href: "/docs/packages/mcp", label: "@thexjs/mcp" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "https://github.com/abdelkabirouadoukou/x", label: "GitHub" },
      { href: "https://github.com/abdelkabirouadoukou/x/issues", label: "Issues" },
      { href: "https://github.com/abdelkabirouadoukou/x/releases", label: "Releases" },
      { href: "https://github.com/abdelkabirouadoukou/x/blob/main/LICENSE", label: "License" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "https://github.com/abdelkabirouadoukou", label: "GitHub" },
      { href: "https://github.com/abdelkabirouadoukou/x", label: "Source" },
    ],
  },
];

function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex h-10 w-10 items-center justify-center border border-rule text-fg"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
          <div className="flex h-header items-center justify-between px-[var(--gutter)]">
            <a href="/" className="flex items-center gap-2.5" aria-label="x home">
              <Logo className="h-9 w-auto" />
              <span className="display text-[1.05rem] font-extrabold leading-none tracking-[-0.04em] text-fg">
                thexjs
              </span>
            </a>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center border border-rule text-fg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-[var(--gutter)] pb-10 pt-4">
            {NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-line py-4 text-[1.75rem] font-semibold text-fg"
              >
                {l.label} <span className="text-fg-faint">→</span>
              </a>
            ))}
            <a
              href="/docs/installation"
              onClick={() => setOpen(false)}
              className="cut mt-6 h-[52px] w-full bg-accent px-6 text-[16px] font-semibold text-white [--cut:11px]"
            >
              Install
            </a>
          </nav>
        </div>
      )}
    </div>
  );
}

export const islands = { MobileMenu, DocsSearch };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <a
        href="/docs/installation"
        className="group/banner block bg-fg text-canvas transition-colors hover:bg-fg/90"
      >
        <div className="mx-auto flex min-h-[34px] w-full max-w-container items-center justify-center gap-2 px-gutter py-1.5 text-[13px] font-medium">
          <span className="rounded-sm bg-accent px-1.5 py-[1px] text-[10px] font-bold uppercase leading-none text-white">
            new
          </span>
          <span>X 1.3 — islands to disk, server-mode islands, image proxy</span>
          <span className="transition-transform group-hover/banner:translate-x-0.5">→</span>
        </div>
      </a>

      <header className="sticky top-0 z-40 w-full border-b border-line bg-canvas">
        <div className="mx-auto flex h-header w-full max-w-container items-center gap-6 px-gutter">
          <a href="/" className="group/logo flex items-center gap-2.5" aria-label="x home">
            <Logo className="h-8 w-auto transition-transform duration-300 group-hover/logo:-rotate-[10deg]" />
            <span className="display text-[1.1rem] font-extrabold leading-none tracking-[-0.04em] text-fg">
              thexjs
            </span>
          </a>

          <nav aria-label="Primary" className="ml-2 hidden shrink-0 items-center gap-0.5 md:flex">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} className="nav-link">
                {l.label}
              </a>
            ))}
          </nav>

          <Island name="DocsSearch" client="idle">
            <DocsSearch />
          </Island>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <a
              href="https://github.com/abdelkabirouadoukou/x"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-subtle hover:text-fg"
            >
              <GitBranch className="h-[18px] w-[18px]" />
            </a>
            <a
              href="/docs/installation"
              className="group/btn cut hidden h-9 items-center px-3.5 text-[13.5px] font-semibold text-canvas [--cut:7px] bg-fg hover:bg-accent hover:text-white md:inline-flex"
            >
              Install
            </a>
            <Island name="MobileMenu" client="idle">
              <MobileMenu />
            </Island>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t border-line bg-subtle/60">
        <div className="mx-auto grid w-full max-w-container gap-12 px-gutter py-16 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-5">
            <a href="/" className="flex items-center gap-2.5" aria-label="x home">
              <Logo className="h-9 w-auto" />
              <span className="display text-[1.05rem] font-extrabold leading-none tracking-[-0.04em] text-fg">
                thexjs
              </span>
            </a>
            <p className="max-w-[28ch] text-[14.5px] leading-relaxed text-fg-muted">
              A fullstack React framework for{" "}
              <a
                href="https://bun.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent"
              >
                Bun
              </a>
              . One process: static, SSR, APIs, and server functions.
            </p>
            <div className="flex items-center gap-1.5">
              <a
                href="https://github.com/abdelkabirouadoukou/x"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-fg"
              >
                <GitBranch className="h-[17px] w-[17px]" />
              </a>
            </div>
          </div>
          {FOOTER_COLS.map((col) => (
            <nav
              key={col.title}
              aria-label={col.title}
              className="flex flex-col gap-2.5 text-[14.5px]"
            >
              <p className="mono mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-faint">
                {col.title}
              </p>
              {col.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="w-fit text-fg-muted transition-colors hover:text-fg"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          ))}
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex w-full max-w-container flex-col items-start justify-between gap-4 px-gutter py-6 text-[13px] text-fg-faint sm:flex-row sm:items-center">
            <span>
              Built for <span className="text-accent">Bun</span> · MIT licensed
            </span>
            <span>© 2026 The X contributors</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
