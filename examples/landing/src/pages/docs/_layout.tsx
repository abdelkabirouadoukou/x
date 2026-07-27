import { Menu, X } from "lucide-react";
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
      <button
        id="sidebar-btn"
        className="fixed left-4 top-20 z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4 btn-icon-open" />
        <X className="hidden h-4 w-4 btn-icon-close" />
      </button>

      <div id="sidebar-overlay" className="fixed inset-0 z-40 hidden bg-black/50 lg:hidden" />

      <aside
        id="sidebar-panel"
        className="fixed left-0 top-16 z-50 hidden h-[calc(100vh-4rem)] w-56 overflow-y-auto border-r border-border/40 bg-background lg:hidden"
      >
        <nav className="px-4 pb-4 pt-0">
          <p className="mb-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Docs</p>
          <ul className="space-y-1">
            {sidebarLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <aside className="hidden w-56 shrink-0 border-r border-border/40 lg:block">
        <nav className="sticky top-16 px-4 pb-4 pt-0">
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

      <script dangerouslySetInnerHTML={{
        __html: `
(function(){
  var btn=document.getElementById("sidebar-btn");
  var panel=document.getElementById("sidebar-panel");
  var overlay=document.getElementById("sidebar-overlay");
  if(!btn||!panel||!overlay)return;
  function close(){btn.classList.remove("open");panel.classList.add("hidden");overlay.classList.add("hidden")}
  function openn(){btn.classList.add("open");panel.classList.remove("hidden");overlay.classList.remove("hidden")}
  btn.addEventListener("click",function(){if(panel.classList.contains("hidden"))openn();else close()});
  overlay.addEventListener("click",close);
  panel.querySelectorAll("a").forEach(function(a){a.addEventListener("click",close)});
})();
        `.trim(),
      }} />
      <style dangerouslySetInnerHTML={{
        __html: `
@media (max-width:1023px){
  #sidebar-btn.open .btn-icon-open{display:none}
  #sidebar-btn.open .btn-icon-close{display:block}
}
        `.trim(),
      }} />
    </div>
  );
}
