import type { ReactNode } from "react";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-8 text-sm text-muted-foreground">
        <a href="/" className="transition-colors hover:text-foreground">Home</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Blog</span>
      </nav>
      <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
        <div>{children}</div>
        <aside className="space-y-8">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Categories</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="transition-colors hover:text-foreground">All Posts</li>
              <li className="transition-colors hover:text-foreground">Tutorials</li>
              <li className="transition-colors hover:text-foreground">Design</li>
              <li className="transition-colors hover:text-foreground">Technology</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {["welcome", "tutorial", "css", "tailwind", "x-framework"].map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
