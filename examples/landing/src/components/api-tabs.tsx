import { useState } from "react";
import { highlight } from "../lib/syntax";

interface ApiTab {
  id: string;
  label: string;
  file: string;
  docs: string;
  blurb: string;
  language: string;
  code: string;
}

const TABS: ApiTab[] = [
  {
    id: "http",
    label: "HTTP server",
    file: "src/api/hello.ts",
    docs: "/docs/api-routes",
    blurb: "REST endpoints beside your pages, same process, same lifecycle.",
    language: "ts",
    code: `export const GET = (req: Request) =>
  Response.json({ hello: "x", time: new Date().toISOString() });`,
  },
  {
    id: "pages",
    label: "Pages & loaders",
    file: "src/pages/posts/[id].tsx",
    docs: "/docs/pages",
    blurb: "Static or server-rendered, chosen per route. Typed params, typed loaders.",
    language: "tsx",
    code: `export const mode = "static";

export async function loader({ params }: RouteProps) {
  const post = await postRepository.get(params.id);
  return { post };
}

export default function Post({ data }: RouteProps) {
  return <main><h1>{data.post.title}</h1></main>;
}`,
  },
  {
    id: "functions",
    label: "Server functions",
    file: "src/lib/actions.ts",
    docs: "/docs/server-functions",
    blurb: "Import server code into client components. Fully typed, CSRF-protected.",
    language: "ts",
    code: `// client component
import { use } from "@thexjs/core";
import { increment } from "../../actions";

export function Likes() {
  const likes = use("likes");
  return <button onClick={() => increment()}>+{likes}</button>;
}`,
  },
  {
    id: "data",
    label: "Data layer",
    file: "src/lib/db.ts",
    docs: "/docs/data-layer",
    blurb: "SQLite and PostgreSQL with migrations, straight from loaders.",
    language: "ts",
    code: `import { defineDb } from "@thexjs/core/data";
import { sql } from "@thexjs/core/data";

const posts = sql\`SELECT * FROM posts ORDER BY published_at DESC\`;
export const posts = await defineDb({ queries: { posts } });`,
  },
  {
    id: "auth",
    label: "Auth",
    file: "src/lib/auth.ts",
    docs: "/docs/packages/auth",
    blurb: "Sessions, credentials + OAuth2 (GitHub), and CSRF, plug and play.",
    language: "ts",
    code: `import { defineAuth } from "@thexjs/auth";

export const auth = defineAuth({
  providers: { github: true },
  database: db,
});

export const { requireUser } = auth.guards;`,
  },
  {
    id: "content",
    label: "Content collections",
    file: "src/content/posts/hello.md",
    docs: "/docs/content-collections",
    blurb: "Markdown with frontmatter becomes typed routes. Code highlighting included.",
    language: "markdown",
    code: `---
title: Hello, x
slug: hello
date: 2026-08-18
---

A markdown file in src/content becomes a page with typed frontmatter.`,
  },
  {
    id: "config",
    label: "Configuration",
    file: "x.config.ts",
    docs: "/docs/configuration",
    blurb: "One typed config file, or none at all; every option has a sensible default.",
    language: "ts",
    code: `import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "src/pages",
  security: { headers: { hsts: true } },
  images: { remoteHosts: ["images.example.com"] },
});`,
  },
];

/**
 * "Batteries included" — a vertical tab rail (horizontal on mobile) next to a
 * single code panel, mirroring bun.sh's API-tabs section.
 */
export default function ApiTabs() {
  const [active, setActive] = useState(TABS[0]?.id ?? "");
  const tab = TABS.find((t) => t.id === active) ?? (TABS[0] as ApiTab);

  return (
    <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr]">
      <div
        role="tablist"
        className="flex gap-1.5 overflow-x-auto pb-1 scroll-none lg:flex-col lg:overflow-visible"
      >
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[14px] transition-[background,color,box-shadow] ${
                isActive
                  ? "bg-surface text-fg shadow-[0_0_0_1px_var(--c-line)]"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                  isActive ? "bg-accent" : "bg-line-strong"
                }`}
              />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
        <div className="overflow-hidden border border-line bg-surface">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
            <p className="text-[14px] text-fg-muted">{tab.blurb}</p>
            <a
              href={tab.docs}
              className="shrink-0 text-[13px] font-medium text-fg underline underline-offset-4 hover:text-accent"
            >
              Docs
            </a>
          </div>
          <div className="CodeBlock !rounded-none !border-0">
            <div className="CodeBlockTab">
              <span>{tab.file}</span>
            </div>
            <pre className="shiki">
              <code className="block">{highlight(tab.code, tab.language)}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
