import type { ReactNode } from "react";

const sidebarLinks = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/routing", label: "Routing" },
  { href: "/docs/pages", label: "Pages & Loaders" },
  { href: "/docs/layouts", label: "Layouts" },
  { href: "/docs/api-routes", label: "API Routes" },
  { href: "/docs/server-functions", label: "Server Functions" },
  { href: "/docs/content-collections", label: "Content Collections" },
  { href: "/docs/middleware", label: "Middleware" },
  { href: "/docs/data-layer", label: "Data Layer" },
  { href: "/docs/build-deploy", label: "Build & Deploy" },
  { href: "/docs/configuration", label: "Configuration" },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl px-6">
      <aside className="hidden w-56 shrink-0 border-r border-border/40 lg:block">
        <nav className="sticky top-20 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Docs</p>
          <ul className="space-y-1">
            {sidebarLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:px-10">{children}</div>
      </div>
    </div>
  );
}
