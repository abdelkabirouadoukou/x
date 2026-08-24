# AGENTS.md

This project is built with **x**, a full-stack React framework on Bun. It
looks similar to Next.js / Remix / Astro / TanStack Start in places but is
NOT any of them — several conventions below are different on purpose.

**This project also ships an MCP server** (`@thexjs/mcp`, wired up in
`.mcp.json` / `.cursor/mcp.json`). If you're an agent with MCP tool access,
call `list_topics` / `get_docs` / `scaffold_file` from the `thexjs` server
before writing framework code — it returns grounded docs and ready-to-paste
snippets instead of you guessing from Next.js/Remix training data. This file
is the fallback for agents without MCP access.

## Routing

Files under `src/pages/` are routes:

```text
pages/index.tsx         -> /
pages/about.tsx         -> /about
pages/blog/[slug].tsx   -> /blog/:slug
pages/_404.tsx          -> 404 page
pages/_layout.tsx       -> layout wrapping this folder + children
pages/_middleware.ts    -> middleware for this folder + children
```

The underscore prefix is load-bearing — there's no `app/` directory and no
`layout.tsx`/`page.tsx` (App Router) naming.

## Loaders

```tsx
import type { LoaderArgs, RouteProps } from "@thexjs/core";

export async function loader({ params, request }: LoaderArgs) {
  return { title: "..." };
}

export default function Page({ loaderData }: RouteProps) {
  return <h1>{String(loaderData?.title)}</h1>;
}
```

Args are `{ params, request }` — not `{ context }`, and not a route-tree
config object. Return a plain object (becomes `loaderData`) or a `Response`
for redirects/status.

## Static rendering

`export const mode = "static";` prerenders at build time. Default is SSR on
every request. `export const revalidate = <seconds>;` for ISR — only
honored on static-mode pages (ignored on the default SSR path).

## API routes

`src/api/*.ts` exports Fetch API handlers:

```ts
export async function GET(req: Request) {
  return Response.json({ ok: true });
}
```

## Server functions (actions) — read this before writing one

`src/actions/*.ts` exports plain async functions. **No `"use server"`
directive.** Import and call them directly from a component; the client
import is rewritten to a fetch wrapper at build time automatically, and the
real function body (db calls, secrets) never reaches the client bundle:

```ts
// src/actions/greet.ts
export async function greet(name: string) {
  return `Hello, ${name}!`;
}
```

```tsx
import { greet } from "../actions/greet";
await greet("world");
```

## Env vars

Only `THEXJS_PUBLIC_*` prefixed vars reach the browser (enforced at build
time). NOT `NEXT_PUBLIC_` / `VITE_`. Everything else is server-only.

## Config

`x.config.ts` at the project root, all fields optional (`pagesDir`,
`layoutsDir`, `apiDir`, `actionsDir`, `contentDir`, `port`).

## CLI

```bash
bun run dev     # x dev
bun run build   # x build -> .x/
bun run start   # x start, serves .x/
```

## Full docs

https://thexjs.vercel.app/docs · https://thexjs.vercel.app/llms.txt
