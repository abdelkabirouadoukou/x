import { join } from "node:path";
import { scanContent } from "@thexjs/core";
import type { LoaderArgs, RouteProps } from "@thexjs/core";

interface BlogEntry {
  routePath: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
}

interface BlogLoaderData {
  entries: BlogEntry[];
}

export async function loader(_args: LoaderArgs) {
  const contentDir = join(import.meta.dir, "..", "..", "..", "content");
  const entries = scanContent(contentDir);
  return {
    entries: entries.map((e) => ({
      routePath: e.routePath,
      title: e.frontmatter.title ?? e.slug,
      description: (e.frontmatter.description as string) ?? "",
      date: (e.frontmatter.date as string) ?? "",
      tags: Array.isArray(e.frontmatter.tags) ? (e.frontmatter.tags as string[]) : [],
    })),
  };
}

export default function BlogPage({ loaderData }: RouteProps) {
  const { entries } = loaderData as unknown as BlogLoaderData;
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">All Posts</h1>
      {entries.length === 0 && (
        <p className="text-muted-foreground">No posts yet. Check back soon!</p>
      )}
      <div className="space-y-6">
        {entries.map((entry) => (
          <a
            key={entry.routePath}
            href={entry.routePath}
            className="group block rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-muted-foreground/30 hover:shadow-lg"
          >
            {entry.date && <p className="text-xs text-muted-foreground">{entry.date}</p>}
            <h2 className="mt-1.5 text-xl font-semibold text-card-foreground transition-colors group-hover:text-primary">
              {entry.title}
            </h2>
            {entry.description && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{entry.description}</p>
            )}
            {Array.isArray(entry.tags) && entry.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {entry.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
