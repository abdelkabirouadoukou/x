import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Login" },
];

export default function MainLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-bold tracking-tight text-foreground">
            SaaS
          </a>
          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
