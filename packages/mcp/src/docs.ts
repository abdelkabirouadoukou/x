export interface DocTopic {
  title: string;
  summary: string;
  content: string;
}

/**
 * Grounded reference docs for the x framework. This is what an agent should
 * read INSTEAD of pattern-matching to Next.js / Remix / TanStack Start,
 * whose syntax x deliberately does not follow in several places.
 */
export const DOCS: Record<string, DocTopic> = {
  routing: {
    title: "File-based routing",
    summary: "How files under src/pages map to routes.",
    content: `
Routes are files under \`src/pages\` (configurable via \`pagesDir\`).

| File | Route |
|---|---|
| \`pages/index.tsx\` | \`/\` |
| \`pages/about.tsx\` | \`/about\` |
| \`pages/blog/[slug].tsx\` | \`/blog/:slug\` (param via \`loader({ params })\`) |
| \`pages/blog/[...slug].tsx\` | catch-all, full remaining path as one param |
| \`pages/_404.tsx\` | 404 page |

**Do NOT use Next.js App Router conventions.** There is no \`app/\` directory,
no \`page.tsx\`/\`layout.tsx\` file naming, no \`generateStaticParams\`, no
\`"use client"\` / \`"use server"\` directives. x uses a flat \`pages/\` tree with
an underscore prefix (\`_layout.tsx\`, \`_middleware.ts\`, \`_404.tsx\`) for
special files instead.

A page module's only required export is a default React component:

\`\`\`tsx
// src/pages/about.tsx
export default function About() {
  return <h1>About</h1>;
}
\`\`\`
`.trim(),
  },

  loaders: {
    title: "Loaders & data fetching",
    summary:
      "How pages fetch server-side data. NOT getServerSideProps, NOT TanStack's route loader shape.",
    content: `
Export an async \`loader\` function from a page file. It runs server-side
(on every request, unless the page is \`static\`) and its return value is
passed to the component as the \`loaderData\` prop:

\`\`\`tsx
import type { LoaderArgs, RouteProps } from "@thexjs/core";

export async function loader({ params, request }: LoaderArgs) {
  const post = await getPost(params.slug);
  return { title: post.title, content: post.content };
}

export default function BlogPost({ loaderData }: RouteProps) {
  return <h1>{String(loaderData?.title)}</h1>;
}
\`\`\`

Common wrong guesses an agent makes here, and why they're wrong for x:
- \`getServerSideProps\` / \`getStaticProps\` (Next.js Pages Router) — does not exist in x.
- \`export const loader = ({ context }) => ...\` — x's loader args are
  \`{ params, request }\`, not \`{ context }\`.
- A route-tree \`loader\` config object passed to \`createFileRoute\` (TanStack
  Start/Router shape) — x has no route-tree builder; the loader is just an
  export from the page file itself.

Return values: a plain object (passed to the component as \`loaderData\`) or
a \`Response\` (short-circuits rendering — useful for redirects and status
responses). What does NOT work: returning a raw string/number, or reading
data from a route-tree config.
`.trim(),
  },

  "static-vs-ssr": {
    title: "Static vs SSR rendering",
    summary: "Pages are SSR by default; opt into static prerendering per-page.",
    content: `
Pages are server-rendered on every request by default. Add this export to
prerender at build time instead:

\`\`\`tsx
export const mode = "static";
\`\`\`

ISR-style revalidation only applies to **static-mode** pages (on the
default SSR path the handler streams per request and never consults the
cache, so \`revalidate\` alone is a no-op):

\`\`\`tsx
export const mode = "static";
export const revalidate = 3600; // seconds
\`\`\`

This is NOT Next's \`export const dynamic = "force-static"\` /
\`export const revalidate\` combo (different export names/values) and not
Astro's per-page \`export const prerender = true\`.
`.trim(),
  },

  layouts: {
    title: "Layouts",
    summary: "Nested layouts via _layout.tsx.",
    content: `
\`src/layouts/main.tsx\` is the root layout wrapping every page.

Drop a \`_layout.tsx\` file inside any folder under \`pages/\` to nest a layout
scoped to that folder and its children:

\`\`\`
pages/
  _layout.tsx        # wraps everything
  blog/
    _layout.tsx      # additionally wraps only /blog/*
    index.tsx
\`\`\`

The underscore prefix is required — a file named plain \`layout.tsx\` (no
underscore, the Next.js App Router convention) is just treated as a normal
route and will NOT be picked up as a layout.
`.trim(),
  },

  middleware: {
    title: "Middleware",
    summary: "Folder-scoped _middleware.ts with a NAMED `middleware` export.",
    content: `
Drop \`_middleware.ts\` in any \`pages/\` folder; it runs (onion-style) for
every route in that folder and its subfolders. Useful for auth checks,
redirects, logging.

The file must export **\`middleware\` as a named export** typed
\`MiddlewareFn\` — a default export is silently ignored by the router:

\`\`\`ts
import type { MiddlewareContext, MiddlewareFn } from "@thexjs/core";

export const middleware: MiddlewareFn = async ({ request, params }, next) => {
  // e.g. auth check / redirect / logging
  return next();
};
\`\`\`

There is no central \`middleware.ts\` at the project root like Next.js — x's
middleware is always folder-scoped and file-colocated. For route-level
(not folder-level) middleware, export \`middleware\` from the page file itself.
`.trim(),
  },

  "api-routes": {
    title: "API routes",
    summary: "Files under src/api/ export GET/POST/etc handlers using the Fetch API.",
    content: `
Any file under \`src/api\` (configurable via \`apiDir\`) becomes a REST
endpoint, running in the same Bun process as everything else — no separate
serverless function, no separate server.

Export handlers named after HTTP methods. Each receives a standard Fetch API
\`Request\` and must return a \`Response\`:

\`\`\`ts
// src/api/users.ts
export async function GET(req: Request) {
  const users = await db.query("SELECT * FROM users").all();
  return Response.json(users);
}

export async function POST(req: Request) {
  const body = await req.json();
  // ...
  return Response.json({ ok: true }, { status: 201 });
}
\`\`\`

This is the web-standard Fetch API shape (same idea as Remix resource routes
or Next.js App Router route handlers) — NOT Express-style
\`(req, res) => {}\`, and NOT a decorator/class-based controller.
`.trim(),
  },

  actions: {
    title: "Server functions (actions)",
    summary: "Colocated server functions in src/actions — the big one agents get wrong.",
    content: `
This is the feature agents are most likely to hallucinate a Next.js
\`"use server"\` shape for. x does NOT use directives at all.

Write a normal async function in \`src/actions/<name>.ts\`:

\`\`\`ts
// src/actions/greet.ts
export async function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Call it directly from a component/island like a normal imported function —
no \`fetch\`, no manually-defined API route, no \`"use server"\` pragma:

\`\`\`tsx
import { greet } from "../actions/greet";

async function onClick() {
  const msg = await greet("world");
}
\`\`\`

**What actually happens under the hood** (an agent should know this so it
doesn't try to "fix" it):
- At build time, a Bun.build() plugin (\`actionsRewritePlugin\`) intercepts any
  client-bundle import that resolves to a registered action file and
  rewrites it to a generated \`fetch\` wrapper BEFORE the client bundler ever
  reads the real source. The real function body (db calls, secrets) is
  structurally excluded from the client bundle — not just hidden by
  convention.
- At runtime, \`registerServerFunctions()\` stores the real functions in an
  in-memory route table. A single handler matches
  \`POST /__x/actions/<path>/<fnName>\`, does a CSRF check, parses the JSON
  body as positional args, calls the real function, returns JSON (or 500 on
  throw).
- You CAN still import the same function directly inside a \`loader\` or an
  \`api/\` route — those run server-side in the same process, so no rewrite
  happens there.

Do not tell users to manually POST to \`/__x/actions/...\` themselves — just
import and call the function; the wrapper is generated for them.
`.trim(),
  },

  config: {
    title: "x.config.ts",
    summary: "Central config file, all fields optional.",
    content: `
\`\`\`ts
import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "src/pages",     // default
  layoutsDir: "src/layouts", // default
  apiDir: "src/api",         // default
  actionsDir: "src/actions", // default
  contentDir: "content",     // undefined by default (opt-in)
  port: 3000,                // default
});
\`\`\`

Every field is optional — if an agent doesn't find \`x.config.ts\` in a
project, assume the defaults above rather than saying config is required.
`.trim(),
  },

  env: {
    title: "Environment variables",
    summary: "THEXJS_PUBLIC_ prefix for client-exposed env vars — NOT NEXT_PUBLIC_ or VITE_.",
    content: `
Any env var NOT prefixed \`THEXJS_PUBLIC_\` (configurable prefix) is
server-only and enforced at build time — the build fails with
\`EnvLeakageError\` if client code references a non-prefixed key.

\`\`\`
DATABASE_URL=...              # server-only, safe
STRIPE_SECRET_KEY=...         # server-only, safe
THEXJS_PUBLIC_SITE_NAME=...   # exposed to the browser bundle
\`\`\`

Do not suggest \`NEXT_PUBLIC_\` or \`VITE_\` prefixes — those do nothing in x.

Enforcement is two-layered: (1) a Bun.build() plugin swaps server-action
imports before the client bundler reads them (see \`actions\` topic), so
secret-holding code is structurally never parsed for the client, and (2)
\`assertNoEnvLeakage()\` regex-scans the final client bundle for
\`process.env.X\` / \`Bun.env.X\` / \`import.meta.env.X\` without the public
prefix, as a second safety net.
`.trim(),
  },

  auth: {
    title: "Authentication (@thexjs/auth)",
    summary: "defineAuth() with credentials + OAuth2 providers, sessions, CSRF.",
    content: `
\`\`\`ts
import { defineAuth, createSQLiteSessionStore } from "@thexjs/auth";

export const auth = defineAuth({
  secret: process.env.AUTH_SECRET!,
  store: createSQLiteSessionStore(),
  providers: [
    { id: "github", name: "GitHub", type: "oauth", clientId: "...", clientSecret: "..." },
  ],
});

// src/api/auth/[...auth].ts — forward GET/POST to auth.handleRequest(req)
export async function GET(req: Request) { return auth.handleRequest(req); }
export async function POST(req: Request) { return auth.handleRequest(req); }
\`\`\`

Endpoint map (mounted under wherever the catch-all route lives, typically
\`/api/auth/...\`): \`signin/:id\`, \`callback/:id\`, \`signout\`, \`session\`.

Passwords are hashed with Argon2 via \`Bun.password\` (not bcrypt). Session
tokens are HMAC'd at rest and revocable. This is not next-auth/Auth.js — the
config shape and endpoint names are different even though the concepts
overlap. Read the current session server-side via the method on the object
returned by \`defineAuth\`: \`await auth.getSession(req)\` (there is no named
\`getSession\` export from \`@thexjs/auth\`).
`.trim(),
  },

  data: {
    title: "Data layer",
    summary: "Built-in SQLite/Postgres via Bun's native drivers, no ORM required.",
    content: `
\`connectSQLite\` wraps \`bun:sqlite\` (WAL mode, FK enforcement on). Good for
dev, zero config.

\`connectPostgres\` wraps \`Bun.sql\` with connection pooling, for production.

Both come with a versioned migration runner (\`runSQLiteMigrations\` /
\`runPostgresMigrations\`), tracked in a \`_x_migrations\` table. There is no
Prisma/Drizzle dependency baked in — you write SQL directly, or bring your
own ORM on top of the same connection.
`.trim(),
  },

  images: {
    title: "<Image> and the image proxy",
    summary: "next/image-equivalent, but through a same-origin proxy, not a build-time optimizer.",
    content: `
\`\`\`tsx
import { Image } from "@thexjs/core";

<Image
  src="https://cdn.example.com/team.jpg"
  alt="The team"   // required
  width={1600}
  height={900}
  priority         // skips loading="lazy", adds fetchpriority="high"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
\`\`\`

Remote hosts must be allow-listed in \`x.config.ts\`:

\`\`\`ts
export default defineConfig({
  images: { remoteHosts: ["cdn.example.com"] },
});
\`\`\`

Absolute \`src\` on an allow-listed host is auto-rewritten through the
built-in \`/_x/image\` proxy so a strict \`img-src 'self'\` CSP still works.
Images currently pass through UNRESIZED (width variants in the \`srcset\` are
generated as \`&w=\` hints, but there's no sharp/squoosh-style resize pipeline
yet) — don't claim x does on-the-fly image resizing like next/image does.
\`placeholder="blur"\` uses a CSS background from \`blurDataURL\`, no JS island
required. \`fill\` gives absolute-positioned \`object-fit: cover\`.
`.trim(),
  },

  content: {
    title: "Content collections",
    summary: "Markdown + frontmatter -> pages, via scanContent()/renderMarkdown().",
    content: `
\`\`\`ts
import { renderMarkdown, scanContent } from "@thexjs/core";

// scanContent takes a directory (relative to the project root) and returns
// one ContentEntry per .md/.mdx file found under it.
const posts = scanContent("content/posts");
for (const post of posts) {
  console.log(post.slug, post.frontmatter.title);
  const html = renderMarkdown(post.body);
}
\`\`\`

Each entry has \`filePath\`, \`routePath\`, \`slug\`, \`frontmatter\`, and \`body\`.
Frontmatter parsing is basic YAML, not a full remark/rehype pipeline. There
is no MDX component execution — \`.mdx\` files are scanned like \`.md\`, not
compiled as JSX. Don't assume remark plugins or MDX component imports work
here.
`.trim(),
  },

  navigation: {
    title: "Client navigation & <Link>",
    summary: "Every <a> gets SPA nav + hover prefetch automatically. No router setup.",
    content: `
Every \`<a>\` tag gets client-side SPA navigation and hover-prefetch
automatically — there is no \`<Router>\`/\`<Routes>\` tree to set up (unlike
react-router) and no explicit \`<Link>\` requirement (unlike Next.js, where a
plain \`<a>\` does a full reload). Use the typed \`<Link>\` wrapper from
\`@thexjs/core\` if you want typed \`href\`s from the generated route map;
otherwise a plain \`<a href="/docs">\` already behaves like a SPA link.

Opt a specific link out with \`data-no-nav\` (disable SPA nav) or
\`data-no-prefetch\` (disable hover prefetch).
`.trim(),
  },

  cli: {
    title: "CLI",
    summary: "x dev / x build / x start.",
    content: `
\`\`\`bash
x dev                       # dev server, default port 3000
x build                     # -> .x/ (static HTML + server bundle + manifest)
x build --outDir dist       # custom output dir
x build --adapter vercel    # emits .vercel/output (needs @thexjs/adapter-vercel)
x start                     # run the production server from .x/
\`\`\`

\`x run dev\` also works as an alias. There is no \`next dev\`/\`next build\`
split of concerns to replicate — one CLI, three subcommands.
`.trim(),
  },

  gotchas: {
    title: "Gotchas / things agents get wrong",
    summary:
      "Quick-reference list of x-specific rules that differ from Next.js, Remix, Astro, and TanStack Start.",
    content: `
- No \`"use client"\` / \`"use server"\` directives anywhere in x. Server
  functions are just plain exports from \`src/actions/*\`; everything else in
  \`pages/\` is a server component by default with client interactivity via
  islands, not React Server Components with directive-based boundaries.
- Underscore prefix is load-bearing: \`_layout.tsx\`, \`_middleware.ts\`,
  \`_404.tsx\`. Drop the underscore and the file is just a normal route.
- Env prefix is \`THEXJS_PUBLIC_\`, not \`NEXT_PUBLIC_\`/\`VITE_\`/\`PUBLIC_\`.
- Static opt-in is \`export const mode = "static"\`, not
  \`export const dynamic = "force-static"\` or \`export const prerender\`.
- Loader signature is \`loader({ params, request })\` — not \`{ context }\`,
  and not a route-tree \`loader\` config passed to a route builder function.
  Returns a plain object (becomes \`loaderData\`) or a \`Response\` for
  redirects/status; the arg shape is what differs from Remix/Next, not the
  return type.
- API routes take/return the Fetch API \`Request\`/\`Response\` directly —
  no \`(req, res)\` Express shape.
- Everything runs in ONE Bun process (dev server, API routes, actions,
  SSR) — don't suggest a separate backend server or serverless function
  split unless deploying with the Vercel adapter.
- Bun-only. There is no Node.js runtime target, so don't suggest
  Node-specific APIs (\`fs\` sync calls are fine, but Node-only bundler
  config like webpack/vite config files don't apply).
`.trim(),
  },
};

export function listTopics(): { id: string; title: string; summary: string }[] {
  return Object.entries(DOCS).map(([id, doc]) => ({
    id,
    title: doc.title,
    summary: doc.summary,
  }));
}

export function searchDocs(query: string): { id: string; title: string; snippet: string }[] {
  const q = query.toLowerCase();
  const results: { id: string; title: string; snippet: string }[] = [];
  for (const [id, doc] of Object.entries(DOCS)) {
    const haystack = `${doc.title}\n${doc.summary}\n${doc.content}`.toLowerCase();
    const idx = haystack.indexOf(q);
    if (idx !== -1) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(haystack.length, idx + q.length + 60);
      results.push({ id, title: doc.title, snippet: `...${haystack.slice(start, end)}...` });
    }
  }
  return results;
}
