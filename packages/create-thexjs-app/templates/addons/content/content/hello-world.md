---
title: Hello from content collections
description: Markdown with frontmatter becomes a route automatically.
---

This page is rendered from a markdown file in `content/` — no route file needed.

Content collections let you write blog posts, docs, and marketing pages as
plain markdown with YAML frontmatter. Each `.md` / `.mdx` file becomes a route
at its path (`content/hello-world.md` -> `/hello-world`).

Use `scanContent()` and `renderMarkdown()` in loaders to build indexes and
dynamic pages on top of your content.
