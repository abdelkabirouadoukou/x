import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Content Collections</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">
        Content collections
      </h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Write content in Markdown with frontmatter, and x automatically turns it into pages. Perfect
        for blogs, documentation, and any content-driven site.
      </p>

      <h2 className="text-xl">Configuration</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
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

      <h2 className="text-xl">Markdown with frontmatter</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
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

## Welcome to X!

This is your first post using X's content collection system.

You can write **markdown** with all the usual syntax:

- Lists
- **Bold** and *italic* text
- \`inline code\` and code blocks

\`\`\`ts
const greeting = "Hello from x!";
console.log(greeting);
\`\`\``}
      />

      <h2 className="text-xl">Reading content in a loader</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Use <span className="text-foreground">scanContent</span> to discover files and{" "}
        <span className="text-foreground">renderMarkdown</span> to convert markdown to HTML in your
        loaders.
      </p>
      <CodeBlock
        label="src/pages/blog/[slug].tsx"
        code={`import type { RouteProps, LoaderArgs } from "@thexjs/core";
import { scanContent, renderMarkdown } from "@thexjs/core";

export async function loader({ params }: LoaderArgs) {
  const posts = scanContent("content/posts");
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return new Response(null, { status: 404 });
  const html = renderMarkdown(post.body);
  return { post: { ...post, html } };
}

export default function BlogPost({ loaderData }: RouteProps) {
  const { post } = loaderData as {
    post: { frontmatter: Record<string, unknown>; html: string };
  };
  return (
    <article className="prose max-w-none">
      <h1 className="text-4xl font-bold">{post.frontmatter.title}</h1>
      <p className="text-sm text-muted-foreground">
        {String(post.frontmatter.date)} — {String(post.frontmatter.author)}
      </p>
      <div
        className="mt-8 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </article>
  );
}`}
      />

      <h2 className="text-xl">scanContent API</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">scanContent(directory)</span> scans a subdirectory of your
        content folder and returns an array of content entries. Each entry includes{" "}
        <span className="text-foreground">slug</span>, <span className="text-foreground">body</span>{" "}
        (the raw markdown), and <span className="text-foreground">frontmatter</span> (parsed YAML).
        Both this and <span className="text-foreground">renderMarkdown</span> are synchronous — no{" "}
        <span className="text-foreground">await</span> needed.
      </p>
      <CodeBlock
        label="content entry"
        code={`interface ContentEntry {
  slug: string;              // "posts/hello-world" — route-safe path
  body: string;              // markdown after the frontmatter block
  frontmatter: Record<string, string | number | boolean | string[] | null>;
}`}
      />

      <h2 className="text-xl">renderMarkdown API</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">renderMarkdown(markdownString)</span> converts markdown to
        an HTML string. It is a lightweight, dependency-free renderer: headings, paragraphs, lists,
        links, inline code, code blocks, bold/italic, and blockquotes are supported, and all output
        is HTML-escaped by default (<span className="text-foreground">escapeHtml</span> is exported
        separately too). It does not run a full markdown engine or syntax highlighter, so for
        heavy-duty content you can swap in your own renderer and feed the result to{" "}
        <span className="text-foreground">dangerouslySetInnerHTML</span>.
      </p>

      <h2 className="text-xl">Auto-routes</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Every <span className="text-foreground">.md</span>/
        <span className="text-foreground">.mdx</span> file under{" "}
        <span className="text-foreground">contentDir</span> becomes a route at its own path during
        build and dev. The <span className="text-foreground">blog</span> template is a working
        example: <span className="text-foreground">content/posts/*.md</span> with a{" "}
        <span className="text-foreground">[slug].tsx</span> page that renders each post via{" "}
        <span className="text-foreground">renderMarkdown</span>.
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
