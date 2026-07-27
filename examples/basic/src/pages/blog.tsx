import { join } from "node:path";
import { scanContent } from "@x/core";
import type { LoaderArgs, RouteProps } from "@x/core";

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
    <main>
      <h1>Blog</h1>
      {entries.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.routePath}>
              <a href={entry.routePath}>{entry.title}</a>
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: "2rem" }}>
        <a href="/">Back home</a>
      </p>
    </main>
  );
}
