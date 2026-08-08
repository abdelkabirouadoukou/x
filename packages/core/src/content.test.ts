import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, renderMarkdown, scanContent } from "./content";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/content");

function touch(relPath: string, content: string) {
  const full = join(FIXTURE_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

beforeAll(() => {
  touch(
    "hello.md",
    `---
title: Hello World
date: 2025-01-01
---

# Hello

This is the body.
`,
  );
  touch(
    "blog/post-one.md",
    `---
title: Post One
tags: a, b
---

Post body.
`,
  );
  touch("plain.txt", "not a content file");
  touch(".hidden.md", "should be skipped");
});

afterAll(() => {
  rmSync(join(import.meta.dir, "__fixtures__"), { recursive: true, force: true });
});

describe("parseFrontmatter", () => {
  test("parses frontmatter and body", () => {
    const { frontmatter, body } = parseFrontmatter(`---
title: Test
---

Body content
`);
    expect(frontmatter.title).toBe("Test");
    expect(body.trim()).toBe("Body content");
  });

  test("returns empty frontmatter when no delimiter", () => {
    const { frontmatter, body } = parseFrontmatter("Just content");
    expect(frontmatter).toEqual({});
    expect(body).toBe("Just content");
  });
});

describe("scanContent", () => {
  test("discovers markdown files with frontmatter", () => {
    const entries = scanContent(FIXTURE_DIR);
    const routes = entries.map((e) => e.routePath).sort();
    expect(routes).toEqual(["/blog/post-one", "/hello"]);
  });

  test("parses frontmatter for each entry", () => {
    const entries = scanContent(FIXTURE_DIR);
    const hello = entries.find((e) => e.routePath === "/hello");
    expect(hello?.frontmatter.title).toBe("Hello World");
  });

  test("skips non-markdown files", () => {
    const entries = scanContent(FIXTURE_DIR);
    expect(entries.some((e) => e.filePath.endsWith("plain.txt"))).toBe(false);
  });
});

describe("renderMarkdown", () => {
  test("escapes raw HTML in prose so scripts cannot execute", () => {
    const html = renderMarkdown("# Hello\n\n<script>alert('xss')</script>\n\nSafe.");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<h1>Hello</h1>");
  });

  test("escapes raw HTML in fenced code blocks without double-escaping", () => {
    const html = renderMarkdown("```html\n<div>hi</div>\n```");
    expect(html).toContain("<pre><code>&lt;div&gt;hi&lt;/div&gt;</code></pre>");
    expect(html).not.toContain("&amp;lt;");
  });

  test("escapes content inside inline code spans", () => {
    const html = renderMarkdown("Use `\u003cscript\u003e` inline.");
    expect(html).toContain("<code>&lt;script&gt;</code>");
    expect(html).not.toContain("<script>");
  });

  test("escapes entity-like text without double-encoding ampersands", () => {
    const html = renderMarkdown("a & b");
    expect(html).toContain("a &amp; b");
    expect(html).not.toContain("&amp;amp;");
  });

  test("renders unordered lists from '- item' lines", () => {
    const html = renderMarkdown("- one\n- two\n- three");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
    expect(html).toContain("<li>three</li>");
    expect(html).toContain("</ul>");
  });

  test("renders ordered lists from '1. item' lines", () => {
    const html = renderMarkdown("1. first\n2. second\n3. third");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("<li>second</li>");
    expect(html).toContain("</ol>");
  });

  test("applies inline formatting inside list items", () => {
    const html = renderMarkdown("- **bold** and `code`");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li><strong>bold</strong> and <code>code</code></li>");
  });

  test("escapes markup in list items to prevent injection", () => {
    const html = renderMarkdown("- \u003cscript\u003ealert(1)\u003c/script\u003e");
    expect(html).toContain("<ul>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
