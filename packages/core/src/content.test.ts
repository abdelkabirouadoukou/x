import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, scanContent } from "./content";

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
