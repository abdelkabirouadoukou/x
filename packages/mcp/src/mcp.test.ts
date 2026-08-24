import { describe, expect, test } from "bun:test";
import { DOCS, listTopics, searchDocs } from "./docs.js";
import { type ScaffoldKind, scaffold } from "./scaffold.js";

describe("DOCS", () => {
  test("every topic has non-empty title, summary, and content", () => {
    for (const [id, doc] of Object.entries(DOCS)) {
      expect(doc.title.length, `title of ${id}`).toBeGreaterThan(0);
      expect(doc.summary.length, `summary of ${id}`).toBeGreaterThan(0);
      expect(doc.content.length, `content of ${id}`).toBeGreaterThan(0);
    }
  });

  test("topic ids are unique and kebab-safe", () => {
    const ids = Object.keys(DOCS);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      // Ids double as URL anchors in llms-full.txt.
      expect(id, `id ${id}`).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("listTopics", () => {
  test("returns one entry per DOCS topic with id/title/summary", () => {
    const topics = listTopics();
    expect(topics.length).toBe(Object.keys(DOCS).length);
    for (const topic of topics) {
      const doc = DOCS[topic.id];
      if (!doc) throw new Error(`listTopics returned unknown id: ${topic.id}`);
      expect(topic.title).toBe(doc.title);
      expect(topic.summary).toBe(doc.summary);
    }
  });
});

describe("searchDocs", () => {
  test("finds matches case-insensitively across title/summary/content", () => {
    const results = searchDocs("CSRF");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.snippet.toLowerCase().includes("csrf"))).toBe(true);
  });

  test("returns no results for garbage queries", () => {
    expect(searchDocs("xyzzy-plugh-zorkmid-42")).toEqual([]);
  });
});

describe("scaffold", () => {
  const cases: [ScaffoldKind, string, string][] = [
    ["page", "about", "src/pages/about.tsx"],
    ["dynamic-page", "users", "src/pages/users/[id].tsx"],
    ["layout", "blog", "src/pages/blog/_layout.tsx"],
    ["middleware", "admin", "src/pages/admin/_middleware.ts"],
    ["api-route", "send-email", "src/api/send-email.ts"],
    ["action", "create-post", "src/actions/create-post.ts"],
  ];

  test("maps every kind to the correct underscore-prefixed convention path", () => {
    for (const [kind, name, path] of cases) {
      expect(scaffold({ kind, name }).path).toBe(path);
    }
  });

  test("generates PascalCase component names from kebab input", () => {
    expect(scaffold({ kind: "page", name: "user-profile" }).code).toContain(
      "function UserProfile()",
    );
    expect(scaffold({ kind: "dynamic-page", name: "blog-post" }).code).toContain("loaderData?.id");
  });

  test("action scaffolds camelCase exports without a 'use server' directive", () => {
    const result = scaffold({ kind: "action", name: "greet-user" });
    expect(result.code).toContain("export async function greetUser(/* args */)");
    // No directive STATEMENT (a comment mentioning it is fine).
    expect(/^\s*"use server"\s*;?/m.test(result.code)).toBe(false);
  });
});
