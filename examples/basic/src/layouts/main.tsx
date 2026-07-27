import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav className="flex items-center gap-6 border-b border-border px-6 py-3">
        <a href="/" className="font-bold text-lg">
          x
        </a>
        <a
          href="/about"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          About
        </a>
        <a
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Dashboard
        </a>
        <a
          href="/posts"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Posts
        </a>
        <a
          href="/placeholder"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Placeholder
        </a>
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </>
  );
}
