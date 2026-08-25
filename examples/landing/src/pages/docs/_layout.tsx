import { BookOpen, Box, Menu, Package, X } from "lucide-react";
import type { ReactNode } from "react";

const sidebarSections: {
  title: string;
  icon: typeof BookOpen;
  links: { href: string; label: string }[];
}[] = [
  {
    title: "Start here",
    icon: BookOpen,
    links: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/introduction", label: "Introduction" },
      { href: "/docs/installation", label: "Installation" },
      { href: "/docs/getting-started", label: "Getting Started" },
    ],
  },
  {
    title: "Packages",
    icon: Package,
    links: [
      { href: "/docs/packages/core", label: "@thexjs/core" },
      { href: "/docs/packages/auth", label: "@thexjs/auth" },
      { href: "/docs/packages/cli", label: "@thexjs/cli" },
      { href: "/docs/packages/env", label: "@thexjs/env" },
      { href: "/docs/packages/adapter-vercel", label: "@thexjs/adapter-vercel" },
      { href: "/docs/packages/hooks", label: "@thexjs/hooks" },
      { href: "/docs/packages/mcp", label: "@thexjs/mcp" },
    ],
  },
  {
    title: "Guides",
    icon: Box,
    links: [
      { href: "/docs/routing", label: "Routing" },
      { href: "/docs/pages", label: "Pages & Loaders" },
      { href: "/docs/layouts", label: "Layouts" },
      { href: "/docs/api-routes", label: "API Routes" },
      { href: "/docs/server-functions", label: "Server Functions" },
      { href: "/docs/islands", label: "Islands" },
      { href: "/docs/isr", label: "Incremental Static Regeneration" },
      { href: "/docs/client-navigation", label: "Client Navigation & Images" },
      { href: "/docs/content-collections", label: "Content Collections" },
      { href: "/docs/middleware", label: "Middleware" },
      { href: "/docs/data-layer", label: "Data Layer" },
      { href: "/docs/build-deploy", label: "Build & Deploy" },
      { href: "/docs/configuration", label: "Configuration" },
      { href: "/docs/migration", label: "Migration Guide" },
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
          <p className="mb-1 flex items-center gap-2 px-4 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
            <section.icon className="h-3.5 w-3.5 text-accent" />
            {section.title}
          </p>
          <ul>
            {section.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  data-doc-link={link.href}
                  className="-ml-px block border-l border-line py-[6px] pl-5 pr-3 text-[13.5px] leading-snug text-fg-muted transition-colors hover:border-accent hover:bg-subtle hover:text-fg"
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
    <div className="mx-auto flex w-full max-w-container px-gutter">
      <button
        id="sidebar-btn"
        type="button"
        className="fixed left-4 top-16 z-50 flex h-10 w-10 items-center justify-center rounded-md border border-line bg-canvas text-fg-muted shadow-sm transition-colors hover:text-fg lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4 btn-icon-open" />
        <X className="hidden h-4 w-4 btn-icon-close" />
      </button>

      <div id="sidebar-overlay" className="fixed inset-0 z-40 hidden bg-fg/50 lg:hidden" />

      <aside
        id="sidebar-panel"
        className="fixed left-0 top-[var(--header-h)] z-50 hidden h-[calc(100vh-var(--header-h))] w-[min(20rem,85vw)] overflow-y-auto border-r border-line bg-canvas lg:hidden"
      >
        <nav className="px-2 pb-8 pt-4">
          <SidebarNav />
        </nav>
      </aside>

      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-line scroll-none lg:sticky lg:top-[var(--header-h)] lg:block lg:max-h-[calc(100vh-var(--header-h))]">
        <nav className="px-2 pb-10 pt-4">
          <SidebarNav />
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-12">
          <nav aria-label="Breadcrumb" className="mb-6 text-[12px] text-fg-faint">
            <ol className="flex items-center gap-1.5">
              <li>X</li>
              <li aria-hidden="true">/</li>
              <li>Docs</li>
            </ol>
          </nav>
          <div className="doc-content">{children}</div>
        </div>
      </div>

      <aside className="hidden 2xl:block 2xl:w-56 2xl:shrink-0">
        <nav
          id="on-this-page"
          className="sticky top-[calc(var(--header-h)+24px)] border-l border-line pl-5 text-[13px]"
        />
      </aside>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  var path=location.pathname.replace(/\\/$/,"")||"/docs";
  document.querySelectorAll("[data-doc-link]").forEach(function(a){
    var href=a.getAttribute("data-doc-link").replace(/\\/$/,"")||"/docs";
    if(href===path||(path!=="/docs"&&href!=="/docs"&&path.indexOf(href)===0)){
      a.classList.add("border-accent","font-semibold","text-fg");
    }
  });
  var btn=document.getElementById("sidebar-btn");
  var panel=document.getElementById("sidebar-panel");
  var overlay=document.getElementById("sidebar-overlay");
  if(btn&&panel&&overlay){
    function close(){btn.classList.remove("open");panel.classList.add("hidden");overlay.classList.add("hidden")}
    function openn(){btn.classList.add("open");panel.classList.remove("hidden");overlay.classList.remove("hidden")}
    btn.addEventListener("click",function(){if(panel.classList.contains("hidden"))openn();else close()});
    overlay.addEventListener("click",close);
    panel.querySelectorAll("a").forEach(function(a){a.addEventListener("click",close)});
  }
  var c=document.querySelector(".doc-content");
  var toc=document.getElementById("on-this-page");
  if(c&&toc){
    var heads=c.querySelectorAll("h2,h3");
    if(heads.length){
      var html="<p class='mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint'>On this page</p>";
      heads.forEach(function(h,i){
        var id=h.id||("sec-"+i);
        h.id=id;
        var lvl=h.tagName==="H3"?"ml-4 text-[12.5px]":"text-[13px] font-medium";
        html+="<a href='#"+id+"' class='block mb-1.5 text-fg-muted hover:text-fg "+lvl+"'>"+h.textContent+"</a>";
      });
      toc.innerHTML=html;
    } else { toc.style.display="none"; }
  }
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
