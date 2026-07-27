<p align="center">
  <a href="#">
    <img src="./examples/landing/public/favicon.ico" alt="x framework logo" width="120" height="120">
  </a>
</p>

<p align="center">

<strong>The ultra-fast, full-stack React framework built natively for Bun.</strong>
Static sites, SSR, file-based API routes, and server functions — running in a single process.

</p>

<p align="center">

<a href="#quick-start"><img src="https://img.shields.io/badge/Bun-1.0+-black?style=flat-square&logo=bun" alt="Bun Ready"></a>

<a href="#features"><img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19"></a>

<a href="#features"><img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript" alt="TypeScript"></a>

<a href="./TASKS.md"><img src="https://img.shields.io/badge/Status-Active_Development-brightgreen?style=flat-square" alt="Status"></a>

</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> •
  <a href="#routing">Routing</a> •
  <a href="#pages--loaders">Pages</a> •
  <a href="#layouts">Layouts</a> •
  <a href="#api-routes">API Routes</a> •
  <a href="#server-functions">Server Functions</a> •
  <a href="#content-collections">Content</a> •
  <a href="#middleware">Middleware</a> •
  <a href="#data-layer">Data</a> •
  <a href="#build--deploy">Deploy</a>
</p>

## Layout

```
packages/core      framework runtime: file-based router, SSR renderer, middleware
packages/cli       x dev / x build / x start
packages/env       type-safe environment variable validation
examples/basic     basic app exercising pages, API routes, server functions
examples/landing   full marketing site with docs, blog (x's own docs site)
examples/blog     blog example with content collections
```

## Getting Started

Create a new x project, learn the project structure, and build your first page.

### Installation

The fastest way to start is with the create-x CLI. Make sure you have [Bun](https://bun.sh) installed, then run:

```bash
bun create x-app@latest my-app
cd my-app
x dev
```

Your app will be running at `http://localhost:3000`.

### Manual setup

If you prefer to set up manually, create a directory and add x:

```bash
mkdir my-app && cd my-app
bun init -y
bun add @x/core
cat << EOF > x.config.ts
import { defineConfig } from "@x/core";
export default defineConfig({
  pagesDir: "src/pages",
});
EOF
```

### Project structure

A typical x project looks like this:

```
my-app/
  x.config.ts
  src/
    pages/           # File-based routes
      index.tsx
      about.tsx
      _404.tsx
      blog/
        [slug].tsx
    layouts/         # Nested layouts
      main.tsx
    api/             # API routes
      hello.ts
    actions/         # Server functions
      greet.ts
  content/           # Markdown content
    posts/
      hello-world.md
```

### Your first page

Create `src/pages/index.tsx` with a simple component:

```tsx
export default function Home() {
  return (
    <div>
      <h1 className="text-4xl font-bold">Hello x!</h1>
      <p className="text-muted-foreground">Welcome to your new app.</p>
    </div>
  );
}
```

### Running the dev server

Start the development server with hot reload:

```bash
x dev
  [x] resolving routes...
  [x] found 3 routes in 12ms
  [x] dev server running at http://localhost:3000
```

The dev server watches your `src/` directory and automatically reloads when files change.

---

## Routing

x uses the file system as your route table. Drop a file in `src/pages/`, get a route.

### How it works

Every `.tsx` file in your pages directory becomes a route. The file path determines the URL pattern.

```
pages/index.tsx         -> /
pages/about.tsx        -> /about
pages/contact.tsx      -> /contact
pages/blog/index.tsx   -> /blog
pages/blog/[slug].tsx  -> /blog/:slug
pages/dashboard/
  settings.tsx         -> /dashboard/settings
  profile.tsx          -> /dashboard/profile
pages/_404.tsx          -> catch-all 404
```

### Static routes

Simple files map to exact URL paths. `pages/about.tsx` becomes `/about`.

```tsx
export default function About() {
  return <h1 className="text-3xl font-bold">About us</h1>;
}
```

### Dynamic segments

Wrap a filename in square brackets to create a dynamic segment. The value is available via the `params` object in loaders.

```tsx
import type { RouteProps, LoaderArgs } from "@x/core";

export async function loader({ params }: LoaderArgs) {
  const post = await getPost(params.slug);
  return { title: post.title, content: post.content };
}

export default function BlogPost({ loaderData }: RouteProps<typeof loader>) {
  return (
    <article>
      <h1 className="text-3xl font-bold">{loaderData.title}</h1>
      <div>{loaderData.content}</div>
    </article>
  );
}
```

Multiple dynamic segments work too: `pages/product/[category]/[id].tsx` → `/product/:category/:id`.

### Nested routes with folders

Organize routes in folders for nested URL structures. Each folder can have its own `index.tsx`.

```
pages/dashboard/
  index.tsx           -> /dashboard
  settings.tsx        -> /dashboard/settings
  profile.tsx         -> /dashboard/profile
  billing/
    index.tsx         -> /dashboard/billing
    history.tsx       -> /dashboard/billing/history
```

### Catch-all 404 page

Create `pages/_404.tsx` to show a custom not-found page for unmatched routes.

```tsx
export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
      <a href="/" className="mt-6 inline-block text-primary hover:underline">
        Go home
      </a>
    </div>
  );
}
```

---

## Pages & Loaders

x supports two page modes — static prerendering and server-side rendering — both powered by loaders.

### Page modes

By default, pages are server-rendered (SSR). Export `mode = "static"` to prerender at build time.

### Static pages

Static pages are rendered at build time and exported as HTML. Use this for marketing pages, blog posts, or any content that doesn't need per-request rendering.

```tsx
import type { RouteProps } from "@x/core";

export const mode = "static";

export default function About({}: RouteProps) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="text-4xl font-bold">About</h1>
      <p className="mt-4 text-muted-foreground">
        This page is prerendered at build time.
      </p>
    </div>
  );
}
```

### Server pages with loaders

Server pages (the default) run a `loader` function on every request. The loader can fetch data, query a database, or call an external API.

```tsx
import type { RouteProps, LoaderArgs } from "@x/core";

export async function loader({ request }: LoaderArgs) {
  const res = await fetch("https://api.example.com/products");
  const products = await res.json();
  return { products };
}

export default function Products({ loaderData }: RouteProps<typeof loader>) {
  return (
    <div>
      <h1 className="text-3xl font-bold">Products</h1>
      <ul className="mt-6 space-y-4">
        {loaderData.products.map((p: any) => (
          <li key={p.id} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-sm text-muted-foreground">{p.price}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Loader with dynamic params

Combined with dynamic routing, loaders receive `params` parsed from the URL path.

```tsx
import type { RouteProps, LoaderArgs } from "@x/core";

export async function loader({ params }: LoaderArgs) {
  const product = await db.query(
    "SELECT * FROM products WHERE id = ?", [params.id]
  );
  if (!product) throw new Response(null, { status: 404 });
  return { product };
}

export default function ProductDetail({ loaderData }: RouteProps<typeof loader>) {
  const { product } = loaderData;
  return (
    <div>
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="mt-2 text-muted-foreground">{product.description}</p>
      <p className="mt-4 text-2xl font-bold text-primary">${product.price}</p>
    </div>
  );
}
```

### RouteProps type

The `RouteProps` type provides typed access to `loaderData`, `params`, and `request`. Pass your loader function as the type parameter for full type safety.

```tsx
import type { RouteProps } from "@x/core";

export default function Page({ loaderData, params, request }: RouteProps<typeof loader>) {
  // loaderData has the return type of loader()
  // params has the dynamic segment types
  // request is the standard Request object
}
```

---

## Layouts

Layouts wrap your pages with shared UI. x supports nested layouts via a dedicated layouts directory and the `_layout.tsx` convention.

### Layouts directory

Configure a layouts directory in `x.config.ts`. Layouts follow the same file-tree hierarchy as pages.

```tsx
import { defineConfig } from "@x/core";

export default defineConfig({
  pagesDir: "src/pages",
  layoutsDir: "src/layouts",
});
```

### Root layout

The root layout wraps every page in your app. Create `src/layouts/main.tsx` to add a header, footer, or global styling.

```tsx
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border p-4">
        <a href="/" className="text-lg font-bold">My App</a>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border p-4 text-center text-sm text-muted-foreground">
        &copy; 2026 My App
      </footer>
    </div>
  );
}
```

### Nested layouts with _layout.tsx

Place a `_layout.tsx` file inside a pages folder to create a nested layout. All pages in that folder (and subfolders) inherit it.

```
pages/
  _layout.tsx         -> root layout
  index.tsx
  blog/
    _layout.tsx       -> nested layout for /blog/*
    index.tsx
    [slug].tsx
```

A nested layout can add a sidebar, breadcrumbs, or section-specific navigation.

```tsx
import type { ReactNode } from "react";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-8">
      <aside className="w-64 shrink-0">
        <nav className="space-y-2">
          <a href="/blog" className="block font-semibold">All posts</a>
          <a href="/blog/category/react" className="block text-muted-foreground hover:text-foreground">React</a>
          <a href="/blog/category/bun" className="block text-muted-foreground hover:text-foreground">Bun</a>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
```

### Layout chain

Layouts nest hierarchically. A page under `pages/blog/[slug].tsx` would be wrapped by `blog/_layout.tsx` and then the root layout. The chain is resolved automatically based on the page's file path.

---

## API Routes

Build REST endpoints alongside your frontend pages. API routes live in `src/api/` and share the same process as your pages.

### File-based API routing

Like pages, API routes use the file system. A file at `src/api/hello.ts` becomes `/api/hello`.

```tsx
import type { ApiHandler } from "@x/core";

export const GET: ApiHandler = ({ request }) => {
  return Response.json({ message: "Hello from x!" });
};
```

### Request & response

Each exported HTTP method receives the request and returns a standard `Response` object. Dynamic segments work the same as pages: `api/users/[id].ts` → `/api/users/:id`.

```tsx
import type { ApiHandler } from "@x/core";

export const GET: ApiHandler = async ({ request }) => {
  const users = await db.query("SELECT * FROM users");
  return Response.json(users);
};

export const POST: ApiHandler = async ({ request }) => {
  const body = await request.json();
  const result = await db.query(
    "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *",
    [body.name, body.email]
  );
  return Response.json(result, { status: 201 });
};
```

### POST endpoint example

```tsx
import type { ApiHandler } from "@x/core";

export const POST: ApiHandler = async ({ request }) => {
  const form = await request.formData();
  const email = form.get("email");
  const message = form.get("message");

  if (!email || !message) {
    return Response.json(
      { error: "Email and message are required" },
      { status: 400 }
    );
  }

  await sendEmail({ email, message });
  return Response.json({ success: true });
};
```

### API route tree

API routes support the same file-tree conventions as pages — nested folders, dynamic segments, and index files.

```
src/api/
  hello.ts         -> GET /api/hello
  users.ts         -> GET, POST /api/users
  users/
    [id].ts       -> GET, PUT, DELETE /api/users/:id
  auth/
    login.ts       -> POST /api/auth/login
    register.ts    -> POST /api/auth/register
```

### Process sharing

API routes run in the same Bun process as your pages and server functions. This means you can share database connections, in-memory caches, and configuration without any network overhead.

---

## Server Functions

Call server-side functions directly from the browser without writing REST endpoints. Server functions live in `src/actions/` and are invoked via fetch.

### Defining server functions

Create a file in `src/actions/` and export named async functions.

```ts
export async function greet(name: string) {
  return `Hello, ${name}! The server time is ${new Date().toISOString()}.`;
}

export async function sendEmail({ to, subject, body }: {
  to: string;
  subject: string;
  body: string;
}) {
  return { sent: true, to };
}
```

### Calling from the browser

Server functions are called by sending a POST request to `/__x/actions/<filename>/<functionName>`. The arguments are sent as JSON in the request body.

```tsx
"use client";

import { useState } from "react";

export default function GreetForm() {
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const name = form.get("name");

    const res = await fetch("/__x/actions/greet/greet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([name]),
    });

    const data = await res.text();
    setMessage(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="name"
        placeholder="Enter your name"
        className="rounded-xl border border-border bg-card px-4 py-2"
      />
      <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">
        Greet me
      </button>
      {message && <p className="text-muted-foreground">{message}</p>}
    </form>
  );
}
```

### Server functions from loaders

You can also import and call server functions directly in loaders — no HTTP needed since they share the same process.

```tsx
import type { RouteProps, LoaderArgs } from "@x/core";
import { getDashboardData } from "../actions/dashboard";

export async function loader({ request }: LoaderArgs) {
  const data = await getDashboardData();
  return { data };
}

export default function Dashboard({ loaderData }: RouteProps<typeof loader>) {
  return <div>...</div>;
}
```

---

## Content Collections

Write content in Markdown with frontmatter, and x automatically turns it into pages. Perfect for blogs, documentation, and any content-driven site.

### Configuration

Point the content directory in `x.config.ts` to a folder with your markdown files.

```tsx
import { defineConfig } from "@x/core";

export default defineConfig({
  contentDir: "content",
});
```

### Markdown with frontmatter

Each markdown file starts with frontmatter (YAML between `---` delimiters) followed by markdown content.

```markdown
---
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
- `inline code` and code blocks

```ts
const greeting = "Hello from x!";
console.log(greeting);
```
```

### Reading content in a loader

Use `scanContent` to discover files and `renderMarkdown` to convert markdown to HTML in your loaders.

```tsx
import type { RouteProps, LoaderArgs } from "@x/core";
import { scanContent, renderMarkdown } from "@x/core";

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
        {loaderData.post.date} &mdash; {loaderData.post.author}
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
}
```

### scanContent API

`scanContent(directory)` scans a subdirectory of your content folder and returns an array of content entries. Each entry includes `slug`, `frontmatter`, and `content`.

### renderMarkdown API

`renderMarkdown(markdownString)` converts markdown to an HTML string. It supports syntax highlighting via Shiki and handles all standard markdown features.

---

## Middleware

Route-level middleware lets you intercept requests before they reach your page or API handler. Use it for authentication, redirects, logging, and validation.

### The _middleware.ts convention

Place a `_middleware.ts` file in any route directory. It runs for all routes in that directory and its subdirectories.

```
pages/
  _middleware.ts         -> runs for all routes
  index.tsx
  dashboard/
    _middleware.ts       -> runs only for /dashboard/*
    settings.tsx
    profile.tsx
  admin/
    _middleware.ts       -> auth check for /admin/*
    index.tsx
```

### Middleware context

A middleware function receives an object with `params` (dynamic route params), `request` (the original Request), and a `next` function to continue the chain.

```ts
import type { MiddlewareContext, MiddlewareNext } from "@x/core";

export async function middleware(ctx: MiddlewareContext, next: MiddlewareNext) {
  console.log(`[${ctx.request.method}] ${ctx.request.url}`);
  return next(ctx);
}
```

### Auth middleware example

```ts
import type { MiddlewareContext, MiddlewareNext } from "@x/core";

export async function middleware(ctx: MiddlewareContext, next: MiddlewareNext) {
  const session = ctx.request.cookies.get("session");

  if (!session) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  const user = await validateSession(session);
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  ctx.params.user = user;
  return next(ctx);
}
```

### MiddlewareNext

Call `next(ctx)` to pass control to the next middleware or the route handler. You can modify `ctx.params` to enrich the request context for downstream handlers.

### Redirect patterns

```ts
// Redirect to login
return new Response(null, {
  status: 302,
  headers: { Location: "/login?redirect=" + ctx.request.url },
});

// Redirect back after successful auth
const url = new URL(ctx.request.url);
const redirectTo = url.searchParams.get("redirect") || "/";
return new Response(null, {
  status: 302,
  headers: { Location: redirectTo },
});
```

---

## Data Layer

x provides built-in SQLite and PostgreSQL integrations. Connect to a database, run migrations, and query data directly from loaders and server functions.

### SQLite

Use `connectSQLite` to connect to a local SQLite database file. SQLite requires zero configuration and is perfect for development and single-server deployments.

```ts
import { connectSQLite, runSQLiteMigrations } from "@x/core";

const db = connectSQLite("data/app.db");

await runSQLiteMigrations(db, [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        body TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `,
  },
]);

export { db };
```

### Querying SQLite

The database object supports prepared statements with `query` and `execute` methods.

```tsx
import type { RouteProps, LoaderArgs } from "@x/core";
import { db } from "../lib/db";

export async function loader({}: LoaderArgs) {
  const users = db.query(
    "SELECT id, name, email FROM users ORDER BY created_at DESC"
  ).all();
  return { users };
}

export default function Users({ loaderData }: RouteProps<typeof loader>) {
  return (
    <div>
      <h1 className="text-3xl font-bold">Users</h1>
      <ul className="mt-6 space-y-3">
        {loaderData.users.map((u: any) => (
          <li key={u.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-semibold">{u.name}</p>
            <p className="text-sm text-muted-foreground">{u.email}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### PostgreSQL

For production deployments, use `connectPostgres` with a connection string. PostgreSQL provides concurrent access, connection pooling, and is suitable for multi-server deployments.

```ts
import { connectPostgres, runPostgresMigrations } from "@x/core";

const db = connectPostgres({
  connectionString: process.env.DATABASE_URL,
  max: 20, // connection pool size
});

await runPostgresMigrations(db, [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  },
]);

export { db };
```

### Migration API

Both `runSQLiteMigrations` and `runPostgresMigrations` take an array of migration objects. Each migration has a `version` number (incrementing) and `sql` string. Migrations are tracked and only run once.

---

## Build & Deploy

x produces optimized production builds with static HTML export, a server entry point, and content collection rendering — all in a single command.

### Build command

Run `x build` to produce a production build. The build output goes to a `.x/` directory.

```bash
x build
  [x] resolving routes...
  [x] found 12 routes
  [x] building static pages...
  [x] building server bundle...
  [x] rendering content collections...
  [x] build complete in 1.2s
```

### Output structure

The `.x/` directory contains everything needed to deploy — static files, server bundle, and assets.

```
.x/
  client/         # Client-side assets
    assets/
      *.js               # Bundled JS
      *.css              # Extracted CSS
  server/         # Server entry point
    index.js             # Bun server bundle
  static/        # Prerendered HTML pages
    index.html
    about/index.html
    blog/
      hello-world/index.html
  x.json             # Build manifest
```

### Static page export

Pages with `mode = "static"` are exported as HTML files in `.x/static/`. Each page is fully rendered at build time, including its loader output.

### Server entry

Server-rendered pages are bundled into `.x/server/index.js`. This file contains all server routes, API handlers, server functions, and middleware.

### Production server

Use `x start` to run the production server. It serves static files from `.x/static/` and handles dynamic routes via the server bundle.

```bash
x start
  [x] production server running at http://localhost:3000
```

### Docker deployment

Deploy with a minimal Docker image using the official Bun runtime. The build output is self-contained.

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock .
RUN bun install
COPY . .
RUN x build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app/.x .x
EXPOSE 3000
CMD ["x", "start"]
```

---

## Configuration

Configure x via `x.config.ts` at your project root. Use `defineConfig` from `@x/core` for type-safe configuration.

### defineConfig

All configuration options are optional. x provides sensible defaults so you can start with zero configuration and add settings as needed.

```ts
import { defineConfig } from "@x/core";

export default defineConfig({
  // Page routes
  pagesDir: "src/pages",

  // Layout directory (for root layouts)
  layoutsDir: "src/layouts",

  // API routes
  apiDir: "src/api",

  // Server functions
  actionsDir: "src/actions",

  // Content collections (markdown)
  contentDir: "content",

  // Dev server port
  port: 3000,

  // Legacy routes directory
  routesDir: "src/routes",
});
```

### All options reference

| Option       | Type     | Default       | Description                        |
|--------------|----------|---------------|------------------------------------|
| `pagesDir`   | `string` | `"src/pages"` | File-based page routes             |
| `layoutsDir` | `string` | `"src/layouts"` | Root layout directory           |
| `apiDir`     | `string` | `"src/api"`   | File-based API routes              |
| `actionsDir` | `string` | `"src/actions"` | Server functions                 |
| `contentDir` | `string` | `"content"`   | Markdown content collections       |
| `port`       | `number` | `3000`        | Dev server port                    |
| `routesDir`  | `string` | `undefined`   | Legacy routes directory            |

### pagesDir

The directory containing your page route files. Defaults to `src/pages`. Each `.tsx` file becomes a route based on its file path.

### layoutsDir

The directory for root layout components. Layouts wrap pages and can be nested using the `_layout.tsx` convention inside page directories.

### apiDir

The directory for API route files. Files here respond to HTTP methods (`GET`, `POST`, etc.) and are served under `/api/...`.

### actionsDir

The directory for server functions. Exported async functions can be called from the browser via `fetch('/__x/actions/...')`.

### contentDir

The directory for markdown content collections. Files with frontmatter are scanned and can be loaded via `scanContent` and `renderMarkdown`.

### port

The port number for the dev server. Defaults to `3000`. Set to a different value if the default port is in use.

---

## Development

```bash
bun install                    # install deps + links the x CLI
bun test                       # run the test suite
bun run typecheck
bun run lint
```

## Production

```bash
x build                        # static export + server bundle -> .x/
x start                        # start the production server from .x/
```

---

<p align="center">
  <a href="./TASKS.md">Build Status</a> &nbsp;|&nbsp;
  <a href="./LICENSE">MIT License</a>
</p>
