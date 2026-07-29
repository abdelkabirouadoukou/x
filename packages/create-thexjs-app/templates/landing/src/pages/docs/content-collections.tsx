import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Content Collections
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Content collections</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Write content in Markdown with frontmatter, and x automatically turns it into pages. Perfect
        for blogs, documentation, and any content-driven site.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Configuration</h2>
      <p className="mt-3 text-muted-foreground">
        Point the content directory in <span className="text-foreground">x.config.ts</span> to a
        folder with your markdown files.
      </p>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig } from "@thexjs/core";

export default defineConfig({
  contentDir: "content",
});`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Markdown with frontmatter</h2>
      <p className="mt-3 text-muted-foreground">
        Each markdown file starts with frontmatter (YAML between{" "}
        <span className="text-foreground">---</span> delimiters) followed by markdown content.
      </p>
      <CodeBlock
        label="content/posts/hello-world.md"
        lang="markdown"
        code={`---
title: Hello World
date: 2026-03-15
tags: [getting-started, tutorial]
author: Jane Doe
---

## Welcome to x!

This is your first post using x's content collection system.

You can write **markdown** with all the usual syntax:

- Lists
- **Bold** and *italic* text
- \`inline code\` and code blocks

\`\`\`ts
const greeting = "Hello from x!";
console.log(greeting);
\`\`\``}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Reading content in a loader</h2>
      <p className="mt-3 text-muted-foreground">
        Use <span className="text-foreground">scanContent</span> to discover files and{" "}
        <span className="text-foreground">renderMarkdown</span> to convert markdown to HTML in your
        loaders.
      </p>
      <CodeBlock
        label="src/pages/blog/[slug].tsx"
        code={`import type { RouteProps, LoaderArgs } from "@thexjs/core";
import { scanContent, renderMarkdown } from "@thexjs/core";

export async function loader({ params }: LoaderArgs) {
  const posts = await scanContent("posts");
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) throw new Response(null, { status: 404 });
  const html = await renderMarkdown(post.body);
  return { post: { ...post, html } };
}

export default function BlogPost({ loaderData }: RouteProps<typeof loader>) {
  return (
    <article className="prose max-w-none">
      <h1 className="text-4xl font-bold">{loaderData.post.title}</h1>
      <p className="text-sm text-muted-foreground">
        {loaderData.post.date} — {loaderData.post.author}
      </p>
      <div className="mt-6 flex gap-2">
        {loaderData.post.tags?.map((tag: string) => (
          <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            {tag}
          </span>
        ))}
      </div>
      <div
        className="mt-8 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: loaderData.post.html }}
      />
    </article>
  );
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">scanContent API</h2>
      <p className="mt-3 text-muted-foreground">
        <span className="text-foreground">scanContent(directory)</span> scans a subdirectory of your
        content folder and returns an array of content entries. Each entry includes{" "}
        <span className="text-foreground">slug</span>,{" "}
        <span className="text-foreground">frontmatter</span>, and{" "}
        <span className="text-foreground">content</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">renderMarkdown API</h2>
      <p className="mt-3 text-muted-foreground">
        <span className="text-foreground">renderMarkdown(markdownString)</span> converts markdown to
        an HTML string. It supports syntax highlighting via Shiki and handles all standard markdown
        features.
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
