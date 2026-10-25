import { Island } from "@thexjs/core";
import { ArrowUpRight, GitBranch, Menu, X } from "lucide-react";
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
      { href: "https://github.com/thexjs/x", label: "GitHub" },
      { href: "https://github.com/thexjs/x/issues", label: "Issues" },
      { href: "https://github.com/thexjs/x/releases", label: "Releases" },
      { href: "https://github.com/thexjs/x/blob/main/LICENSE", label: "License" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "https://github.com/abdelkabirouadoukou", label: "GitHub" },
      { href: "https://github.com/thexjs/x", label: "Source" },
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
        className="inline-flex h-10 w-10 items-center justify-center border border-line-strong text-fg"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="dark fixed inset-0 z-[70] flex flex-col bg-canvas text-fg">
          <div className="flex h-header items-center justify-between px-[var(--gutter)]">
            <a href="/" className="flex items-center gap-2.5" aria-label="x home">
              <Logo className="h-9 w-auto" />
              <span className="display text-[1.1rem] font-extrabold leading-none tracking-[-0.04em]">
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
          <nav className="flex flex-1 flex-col overflow-y-auto px-[var(--gutter)] pb-10 pt-6">
            {NAV.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="group flex items-baseline gap-4 border-b border-rule py-5 font-display text-[clamp(2.4rem,12vw,4.4rem)] font-extrabold leading-none tracking-[-0.04em]"
              >
                <span className="font-mono text-[11px] font-medium tracking-[0.1em] text-accent">
                  0{i + 1}
                </span>
                {l.label}
                <span className="ml-auto text-fg-faint transition-transform group-hover:translate-x-1">
                  →
                </span>
              </a>
            ))}
            <a
              href="/docs/installation"
              onClick={() => setOpen(false)}
              className="lp-btn lp-btn-solid mt-8 h-[56px] w-full justify-center"
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

const ACTIVE_NAV = `(function(){var p=location.pathname.replace(/\\/$/,"")||"/";document.querySelectorAll("[data-nav]").forEach(function(a){var h=a.getAttribute("data-nav");if(p===h||(h!=="/"&&p.indexOf(h)===0))a.setAttribute("aria-current","page")})})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <a
        href="/docs/installation"
        className="group/banner block border-b border-rule bg-[#0a0a0a] text-[#f2f2f0]"
      >
        <div className="mx-auto flex min-h-[34px] w-full max-w-[90rem] items-center justify-center gap-3 px-gutter py-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em]">
          <span className="bg-[#28dc82] px-1.5 py-[1px] text-[10px] font-bold leading-none text-[#0a0a0a]">
            new
          </span>
          <span className="truncate">X 1.3: islands to disk, server-mode islands, image proxy</span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#28dc82] transition-transform group-hover/banner:translate-x-0.5 group-hover/banner:-translate-y-0.5" />
        </div>
      </a>

      <header className="sticky top-0 z-40 w-full border-b border-line-strong bg-canvas">
        <div className="mx-auto flex h-header w-full max-w-[90rem] items-center gap-3 px-gutter sm:gap-6">
          <a href="/" className="group/logo flex items-center gap-2.5" aria-label="x home">
            <Logo className="h-8 w-auto transition-transform duration-300 group-hover/logo:-rotate-[10deg]" />
            <span className="display text-[1.15rem] font-extrabold leading-none tracking-[-0.04em] text-fg">
              thexjs
            </span>
          </a>

          <nav aria-label="Primary" className="ml-4 hidden shrink-0 items-center gap-1 md:flex">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} data-nav={l.href} className="nav-link">
                {l.label}
              </a>
            ))}
          </nav>

          <Island name="DocsSearch" client="idle">
            <DocsSearch />
          </Island>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <a
              href="https://github.com/thexjs/x"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="hidden h-10 w-10 items-center justify-center border border-transparent text-fg-muted transition-colors hover:border-line-strong hover:text-fg sm:inline-flex"
            >
              <GitBranch className="h-[18px] w-[18px]" />
            </a>
            <a
              href="/docs/installation"
              className="lp-btn lp-btn-solid hidden !h-10 !px-4 !text-[11.5px] md:inline-flex"
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

      <footer className="dark relative mt-auto overflow-hidden bg-canvas text-fg">
        <div className="mx-auto w-full max-w-[90rem] px-gutter pt-16 sm:pt-24">
          <div className="grid gap-12 border-b border-rule pb-14 md:grid-cols-[1.5fr_repeat(4,1fr)]">
            <div className="flex flex-col gap-5">
              <p className="font-display text-[clamp(1.6rem,2.4vw,2.2rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
                One process.
                <br />
                <span className="font-serif italic font-normal text-[#28dc82]">Everything</span>{" "}
                included.
              </p>
              <p className="max-w-[30ch] text-[14.5px] leading-relaxed text-fg-muted">
                A fullstack React framework for{" "}
                <a
                  href="https://bun.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-[#28dc82]"
                >
                  Bun
                </a>
                : static, SSR, APIs and server functions.
              </p>
              <a
                href="https://github.com/thexjs/x"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-btn lp-btn-ghost !h-10 w-fit !px-4 !text-[11.5px]"
              >
                <GitBranch className="h-4 w-4" /> Star on GitHub
              </a>
            </div>
            {FOOTER_COLS.map((col) => (
              <nav
                key={col.title}
                aria-label={col.title}
                className="flex flex-col gap-2.5 text-[14.5px]"
              >
                <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#28dc82]">
                  {col.title}
                </p>
                {col.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    className="w-fit text-fg-muted transition-colors hover:text-fg hover:underline hover:decoration-[#28dc82] hover:underline-offset-4"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            ))}
          </div>

          <div className="flex flex-col items-start justify-between gap-4 py-6 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-faint sm:flex-row sm:items-center">
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[#28dc82]" /> Built for Bun · MIT licensed
            </span>
            <span>© 2026 The X contributors</span>
            <a href="#top" className="text-fg transition-colors hover:text-[#28dc82]">
              Back to top ↑
            </a>
          </div>
        </div>

        <p className="foot-word" aria-hidden="true">
          thexjs
        </p>
      </footer>

      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static constant */}
      <script dangerouslySetInnerHTML={{ __html: ACTIVE_NAV }} />
    </div>
  );
}
