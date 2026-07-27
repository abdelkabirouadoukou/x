import { join } from "node:path";
import { renderMarkdown, scanContent } from "@x/core";
import type { LoaderArgs, RouteProps } from "@x/core";

interface PostLoaderData {
  html: string;
  title: string;
  date: string;
  tags: string[];
}

export async function loader({ params }: LoaderArgs) {
  const contentDir = join(import.meta.dir, "..", "..", "..", "content");
  const entries = scanContent(contentDir);
  const entry = entries.find((e) => e.slug === params.slug);
  if (!entry) return new Response(null, { status: 302, headers: { Location: "/blog" } });
  const html = await renderMarkdown(entry.body);
  return {
    html,
    title: entry.frontmatter.title ?? entry.slug,
    date: entry.frontmatter.date ?? "",
    tags: (entry.frontmatter.tags ?? []) as string[],
  };
}

export default function BlogPostPage({ loaderData }: RouteProps) {
  const data = loaderData as Record<string, unknown>;
  const html = data.html as string;
  const title = data.title as string;
  const date = data.date as string;
  const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
  return (
    <article className="max-w-prose">
      <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {date && <time dateTime={date}>{date}</time>}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        className="prose prose-invert mt-8 max-w-none prose-headings:scroll-m-20 prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-card prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
