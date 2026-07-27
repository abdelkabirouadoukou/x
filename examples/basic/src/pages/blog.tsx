import { join } from "node:path";
import { scanContent } from "@thexjs/core";
import type { LoaderArgs, RouteProps } from "@thexjs/core";

export async function loader(_args: LoaderArgs) {
  const contentDir = join(import.meta.dir, "..", "..", "content");
  const entries = scanContent(contentDir);
  return {
    entries: entries.map((e) => ({ routePath: e.routePath, title: e.frontmatter.title ?? e.slug })),
  };
}

export default function BlogPage({ loaderData }: RouteProps) {
  const entries = (loaderData?.entries ?? []) as { routePath: string; title: string }[];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Blog</h1>
      {entries.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.routePath}>
              <a href={entry.routePath} className="text-primary hover:underline">
                {entry.title}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="pt-4">
        <a
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back home
        </a>
      </p>
    </div>
  );
}
