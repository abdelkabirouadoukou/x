import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Layouts</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Layouts</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Layouts wrap your pages with shared UI. x supports nested layouts via a dedicated layouts
        directory and the <span className="text-foreground">_layout.tsx</span> convention.
      </p>

      <h2 className="text-xl">Layouts directory</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Configure a layouts directory in <span className="text-foreground">x.config.ts</span>. Every
        file in it acts as a root-level layout and wraps all your routes.
      </p>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "src/pages",
  layoutsDir: "src/layouts",
});`}
      />

      <h2 className="text-xl">Root layout</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Any layout in the dedicated layouts directory wraps every route page. Create{" "}
        <span className="text-foreground">src/layouts/main.tsx</span> to add a header, footer, or
        global styling. A <span className="text-foreground">_layout.tsx</span> at the root of{" "}
        <span className="text-foreground">pages/</span> also serves as the root layout for page
        routes (and is the one used to wrap the 404 page).
      </p>
      <CodeBlock
        label="src/layouts/main.tsx"
        code={`import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border p-4">
        <a href="/docs" className="text-lg font-bold">My App</a>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border p-4 text-center text-sm text-muted-foreground">
        © 2026 My App
      </footer>
    </div>
  );
}`}
      />

      <h2 className="text-xl">Nested layouts with _layout.tsx</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Place a <span className="text-foreground">_layout.tsx</span> file inside a pages folder to
        create a nested layout. All pages in that folder (and subfolders) inherit it.
      </p>
      <CodeBlock
        label="file tree"
        lang="tree"
        code={`pages/
  _layout.tsx         -> root layout
  index.tsx
  blog/
    _layout.tsx       -> nested layout for /blog/*
    index.tsx
    [slug].tsx`}
      />

      <h2 className="text-xl">Nested blog layout example</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        A nested layout can add a sidebar, breadcrumbs, or section-specific navigation.
      </p>
      <CodeBlock
        label="src/pages/blog/_layout.tsx"
        code={`import type { ReactNode } from "react";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-8">
      <aside className="w-64 shrink-0">
        <nav className="space-y-2">
          <a href="/blog" className="block font-semibold">All posts</a>
          <a href="/blog/category/react" className="block text-muted-foreground hover:text-foreground">React</a>
          <a href="/blog/category/bun" className="block text-muted-foreground hover:text-foreground">Bun</a>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}`}
      />

      <h2 className="text-xl">Layout chain</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Layouts nest hierarchically. A page under{" "}
        <span className="text-foreground">pages/blog/[slug].tsx</span> would be wrapped by{" "}
        <span className="text-foreground">blog/_layout.tsx</span> and then the root layout. The
        chain is resolved automatically based on the page's file path.
      </p>

      <div className="mt-16 border-t border-border pt-8">
        <a
          href="/docs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to docs
        </a>
      </div>
    </div>
  );
}
