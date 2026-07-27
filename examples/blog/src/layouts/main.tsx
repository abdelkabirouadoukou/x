import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <a href="/" className="text-xl font-bold tracking-tight text-foreground">
            Blog
          </a>
          <nav className="flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="/" className="transition-colors hover:text-foreground">
              Home
            </a>
            <a href="/blog" className="transition-colors hover:text-foreground">
              Blog
            </a>
            <a href="/about" className="transition-colors hover:text-foreground">
              About
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} The Blog. Built with x framework.
        </div>
      </footer>
    </div>
  );
}
