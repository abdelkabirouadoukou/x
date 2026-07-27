import type { RouteProps } from "@x/core";

export default function AboutPage(_props: RouteProps) {
  return (
    <div className="mx-auto max-w-prose px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">About This Blog</h1>
      <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
        <p>
          The Blog is a showcase for the <strong className="text-foreground">x framework</strong> —
          a Bun-based fullstack framework that combines static generation, server-side rendering,
          and API routes in a single process. This example demonstrates file-based routing, content
          collections, layouts, and more.
        </p>
        <p>
          Built with Tailwind CSS v4 and shadcn/ui components, the design emphasizes readability,
          modern aesthetics, and a dark theme out of the box. Every page is responsive, accessible,
          and performant.
        </p>
      </div>
      <div className="mt-12 rounded-2xl border border-border bg-card p-8">
        <h2 className="text-xl font-semibold tracking-tight">Author</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            X
          </div>
          <div>
            <p className="font-medium text-card-foreground">x Framework Team</p>
            <p className="text-sm text-muted-foreground">
              Building the future of fullstack development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
