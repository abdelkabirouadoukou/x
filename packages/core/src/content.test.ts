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

  test("keeps a heading inside a fenced code block as literal text", () => {
    const html = renderMarkdown("```\n# not a heading\n```");
    expect(html).toContain("<pre><code># not a heading</code></pre>");
    expect(html).not.toContain("<h1>");
  });

  test("keeps subheadings inside a fenced code block as literal text", () => {
    const html = renderMarkdown("```\n## two\n### three\n```");
    expect(html).toContain("<pre><code>## two\n### three</code></pre>");
    expect(html).not.toContain("<h2>");
    expect(html).not.toContain("<h3>");
  });

  test("keeps bold/italic inside a fenced code block as literal text", () => {
    const html = renderMarkdown("```\n**not bold** and *not italic*\n```");
    expect(html).toContain("<pre><code>**not bold** and *not italic*</code></pre>");
    expect(html).not.toContain("<strong>");
    expect(html).not.toContain("<em>");
  });

  test("keeps a markdown link inside a fenced code block as literal text", () => {
    const html = renderMarkdown("```\n[not a link](https://example.com)\n```");
    expect(html).toContain("<pre><code>[not a link](https://example.com)</code></pre>");
    expect(html).not.toContain("<a");
  });

  test("keeps a fenced block intact when prose follows it", () => {
    const html = renderMarkdown("```\n# heading\n```\n\nAfter, with **bold**.");
    expect(html).toContain("<pre><code># heading</code></pre>");
    expect(html).not.toContain("<h1>");
    expect(html).toContain("<p>After, with <strong>bold</strong>.</p>");
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

describe("renderMarkdown link URL sanitization", () => {
  test("renders a javascript: link as plain text, never as an anchor", () => {
    const html = renderMarkdown("[run](javascript:alert(1))");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("href");
    expect(html).toContain("run");
  });

  test("rejects an uppercase JavaScript: scheme", () => {
    const html = renderMarkdown("[run](JavaScript:alert(1))");
    expect(html).not.toContain("<a");
    expect(html).toContain("run");
  });

  test("rejects a percent-encoded javascript: URL", () => {
    const html = renderMarkdown("[run](javascript:alert%281%29)");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("href");
    expect(html).toContain("run");
  });

  test("rejects a scheme-encoded (mixed) javascript: URL", () => {
    const html = renderMarkdown("[run](java%73cript:alert(1))");
    expect(html).not.toContain("<a");
    expect(html).toContain("run");
  });

  test("rejects a double-percent-encoded javascript: URL", () => {
    const html = renderMarkdown("[run](java%2573cript:alert(1))");
    expect(html).not.toContain("<a href");
    expect(html).toContain("run");
  });

  test("rejects a triple-percent-encoded javascript: URL", () => {
    const html = renderMarkdown("[run](java%252573cript:alert(1))");
    expect(html).not.toContain("<a href");
    expect(html).toContain("run");
  });

  test("rejects a javascript: URL with a literal tab splitting the scheme", () => {
    const html = renderMarkdown("[run](java\tscript:alert%281%29)");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("href");
    expect(html).toContain("run");
  });

  test("rejects a javascript: URL with a literal carriage return splitting the scheme", () => {
    const html = renderMarkdown("[run](java\rscript:alert%281%29)");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("href");
    expect(html).toContain("run");
  });

  test("rejects a javascript: URL with a literal newline splitting the scheme", () => {
    const html = renderMarkdown("[run](java\nscript:alert%281%29)");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("href");
    expect(html).toContain("run");
  });

  test("rejects a tab-split scheme with encoded parens and mixed-cased scheme", () => {
    const html = renderMarkdown("[run](JaVa\tscript:alert%281%29)");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("href");
    expect(html).toContain("run");
  });

  test("strips control characters from a safe URL and renders the cleaned href", () => {
    const html = renderMarkdown("[docs](https://example.com/\tdocs)");
    expect(html).toContain('<a href="https://example.com/docs">docs</a>');
    expect(html).not.toContain("\t");
  });

  test("rejects a data: URL", () => {
    const html = renderMarkdown(
      "[x](data:text/html,\u003cscript\u003ealert(1)\u003c/script\u003e)",
    );
    expect(html).not.toContain("<a");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("href");
  });

  test("rejects vbscript: and other unknown schemes", () => {
    const html = renderMarkdown("[x](vbscript:msgbox(1)) [y](ftp://files.example.com/a)");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("href");
  });

  test("keeps http/https links as anchors", () => {
    const html = renderMarkdown("[docs](https://example.com) [api](http://localhost/api?x=1&y=2)");
    expect(html).toContain('<a href="https://example.com">docs</a>');
    expect(html).toContain('<a href="http://localhost/api?x=1&amp;y=2">api</a>');
  });

  test("keeps mailto and relative links as anchors", () => {
    const html = renderMarkdown(
      "[mail](mailto:hi@example.com) [home](/foo) [rel](./bar) [up](../up) [anchor](#top) [proto](//cdn.example.com/x)",
    );
    expect(html).toContain('<a href="mailto:hi@example.com">mail</a>');
    expect(html).toContain('<a href="/foo">home</a>');
    expect(html).toContain('<a href="./bar">rel</a>');
    expect(html).toContain('<a href="../up">up</a>');
    expect(html).toContain('<a href="#top">anchor</a>');
    expect(html).toContain('<a href="//cdn.example.com/x">proto</a>');
  });
});
