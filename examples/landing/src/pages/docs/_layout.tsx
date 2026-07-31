import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";

const sidebarSections = [
  {
    title: "Start here",
    links: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/introduction", label: "Introduction" },
      { href: "/docs/installation", label: "Installation" },
      { href: "/docs/getting-started", label: "Getting Started" },
    ],
  },
  {
    title: "Packages",
    links: [
      { href: "/docs/packages/core", label: "@thexjs/core" },
      { href: "/docs/packages/cli", label: "@thexjs/cli" },
      { href: "/docs/packages/env", label: "@thexjs/env" },
      { href: "/docs/packages/adapter-vercel", label: "@thexjs/adapter-vercel" },
    ],
  },
  {
    title: "Guides",
    links: [
      { href: "/docs/routing", label: "Routing" },
      { href: "/docs/pages", label: "Pages & Loaders" },
      { href: "/docs/layouts", label: "Layouts" },
      { href: "/docs/api-routes", label: "API Routes" },
      { href: "/docs/server-functions", label: "Server Functions" },
      { href: "/docs/client-navigation", label: "Client Navigation & Images" },
      { href: "/docs/content-collections", label: "Content Collections" },
      { href: "/docs/middleware", label: "Middleware" },
      { href: "/docs/data-layer", label: "Data Layer" },
      { href: "/docs/build-deploy", label: "Build & Deploy" },
      { href: "/docs/configuration", label: "Configuration" },
      { href: "/docs/security", label: "Security" },
      { href: "/docs/observability", label: "Observability" },
    ],
  },
];

function SidebarNav() {
  return (
    <>
      {sidebarSections.map((section) => (
        <div key={section.title} className="mb-7 last:mb-0">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  data-doc-link={link.href}
                  className="doc-nav-link block rounded-lg border border-transparent px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:border-border/60 hover:bg-muted/50 hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-6xl px-4 sm:px-6">
      <button
        id="sidebar-btn"
        type="button"
        className="fixed left-4 top-[4.25rem] z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4 btn-icon-open" />
        <X className="hidden h-4 w-4 btn-icon-close" />
      </button>

      <div id="sidebar-overlay" className="fixed inset-0 z-40 hidden bg-black/60 lg:hidden" />

      <aside
        id="sidebar-panel"
        className="fixed left-0 top-14 z-50 hidden h-[calc(100vh-3.5rem)] w-60 overflow-y-auto border-r border-border/50 bg-background lg:hidden"
      >
        <nav className="px-3 pb-6 pt-4">
          <SidebarNav />
        </nav>
      </aside>

      <aside className="hidden w-60 shrink-0 border-r border-border/50 lg:block">
        <nav className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto px-3 pb-8 pt-2">
          <SidebarNav />
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="doc-content mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-12">{children}</div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  var path=location.pathname.replace(/\\/$/,"")||"/docs";
  document.querySelectorAll("[data-doc-link]").forEach(function(a){
    var href=a.getAttribute("data-doc-link").replace(/\\/$/,"")||"/docs";
    if(href===path||(path!=="/docs"&&href!=="/docs"&&path.indexOf(href)===0)){
      a.classList.add("border-primary/30","bg-primary/10","text-primary");
    }
  });
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
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (max-width:1023px){
  #sidebar-btn.open .btn-icon-open{display:none}
  #sidebar-btn.open .btn-icon-close{display:block}
}
          `.trim(),
        }}
      />
    </div>
  );
}
