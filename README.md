<p align="center">
  <a href="#">
    <img src="./examples/landing/public/favicon.ico" alt="x framework logo" width="120" height="120">
  </a>
</p>

<p align="center">
A full-stack React framework built on top of Bun. It features file-based routing, API routes, server functions, and SSR/static rendering. All of these run in one process instead of using five different tools combined.
</p>

<p align="center">
<a href="#quick-start"><img src="https://img.shields.io/badge/Bun-1.0+-black?style=flat-square&logo=bun" alt="Bun Ready"></a>
<a href="#features"><img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19"></a>
<a href="#features"><img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript" alt="TypeScript"></a>
<a href="./TASKS.md"><img src="https://img.shields.io/badge/Status-Active_Development-brightgreen?style=flat-square" alt="Status"></a>
<a href="https://stardance.hackclub.com/projects/41081"><img src="https://img.shields.io/badge/Stardance-hackclub-blue?style=flat-square" alt="Stardance"></a>
</p>

<p align="center">
  <a href="https://stardance.hackclub.com/projects/41081">
    <img src="https://stardance.hackclub.com/assets/landing/header/stardance-logo-df399a7f.png" alt="Stardance" height="24">
  </a>
</p>

## Why I built this

I was building a SaaS called [autopermit](https://autopermit.vercel.app) using Next.js and Vercel. Every click in the dashboard felt slow, and the deployments took too long. Before that, I created a small blog on Astro, and I appreciated how fast the frontend felt. So, I had this idea in my head: combine Astro's frontend speed with Next.js's backend, without putting two frameworks together.

I didn't know how to make that happen until I started exploring Bun. It already comes with a bundler, a runtime, a package manager, and native SQLite/Postgres drivers. That’s when I realized I didn’t need to connect two bulky frameworks. I needed one framework based on Bun's foundations instead of adding more tools around it.

That's x. I'm 18, and this is the first framework I've tried to design. Most of this journey was me figuring things out as I went, not following a specific plan.

## What was hard

I'd never designed a framework before this, so I spent time reading how Next.js, Astro, and Remix set up their routing and rendering before writing any code. The bundler was the part that really gave me trouble in getting the client/server boundary right. I wanted to make sure a `DATABASE_URL` or `STRIPE_SECRET_KEY` didn't accidentally end up in the browser bundle. It took a few rewrites to get that right.

I kept a `TASKS.md` file in the repo the whole time. That way, I had something to refer to when I lost track of what "done" meant. It's still in the history if you want to see how the scope changed. There were also a few nights when I was tired and pushed through code without thinking it through completely. I had to go back later and clean some of that up.

## What I'm proud of

Deploy speed. I push a commit, refresh the site, and it’s already live. That never happened to me on Next.js or Vercel, where deploys took a long time. I’m also pleased with how the split feels in practice. It’s Astro-like on the frontend and Next.js-like on the backend, both running through Bun instead of on top of it.

## Try it

Not production-ready this is a solo project built to solve a problem I had and to learn how frameworks actually work underneath.

```bash
bun create thexjs-app@latest my-app
cd my-app
bun run dev
```

Pick the `default` template when prompted (just a blank home page), then the dev server runs at `http://localhost:3000`.

Other templates: `basic` (pages + API + auth + dashboard), `blog` (markdown content collections), `saas` (dashboard + data layer), `landing` (the docs site itself).

## What's inside

```
packages/core           file-based router, SSR renderer, middleware
packages/cli             x dev / x build / x start
packages/env             typed env variable validation
packages/create-thexjs-app  the scaffolder (bun create thexjs-app@latest)
examples/default         minimal starter
examples/basic           pages, API routes, auth, dashboard
examples/landing         the docs site
examples/blog            blog w/ content collections
examples/saas            saas dashboard demo
```

A typical project looks like:

```
my-app/
  x.config.ts
  src/
    pages/       # file-based routes
    layouts/     # nested layouts (_layout.tsx)
    api/         # REST endpoints
    actions/     # server functions
  content/       # markdown collections
```

## Routing

Every `.tsx` file under `src/pages/` becomes a route based on its path:

```
pages/index.tsx         -> /
pages/about.tsx         -> /about
pages/blog/[slug].tsx   -> /blog/:slug
pages/_404.tsx          -> catch-all 404
```

Dynamic segments (`[slug]`) show up in the loader via `params`:

```tsx
export async function loader({ params }: LoaderArgs) {
  const post = await getPost(params.slug);
  return { title: post.title, content: post.content };
}

export default function BlogPost({ loaderData }: RouteProps<typeof loader>) {
  return <h1>{loaderData.title}</h1>;
}
```

## Static vs SSR

Pages are server-rendered by default. Add `export const mode = "static"` to prerender at build time instead:

```tsx
export const mode = "static";

export default function About() {
  return <h1>About</h1>;
}
```

SSR pages run their `loader` on every request:

```tsx
export async function loader({ request }: LoaderArgs) {
  const res = await fetch("https://api.example.com/products");
  return { products: await res.json() };
}
```

## Layouts

`src/layouts/main.tsx` is the root layout wrapping every page. Drop a `_layout.tsx` inside any pages folder to nest a layout for that section:

```
pages/
  _layout.tsx
  blog/
    _layout.tsx    # only wraps /blog/*
    index.tsx
```

## API routes

Files under `src/api/` become REST endpoints, running in the same process as everything else:

```tsx
export const GET: ApiHandler = async () => {
  const users = await db.query("SELECT * FROM users");
  return Response.json(users);
};
```

## Server functions

Write a normal async function in `src/actions/`, call it from the browser without hand-writing a REST endpoint:

```ts
// src/actions/greet.ts
export async function greet(name: string) {
  return `Hello, ${name}!`;
}
```

Calling it from a component sends a POST to `/__x/actions/greet/greet` under the hood, or you can just import it directly inside a loader since it's all the same process.

## Content collections

Markdown + frontmatter in, pages out:

```ts
const posts = await scanContent("posts");
const html = await renderMarkdown(post.body);
```

## Middleware

Drop a `_middleware.ts` in any pages folder — it runs for that folder and everything under it. Useful for auth checks, redirects, logging.

## Data layer

Built-in SQLite (`connectSQLite`, zero config, good for dev) and Postgres (`connectPostgres`, connection pooling, for production) with versioned migrations for both.

## Build & deploy

```bash
x build     # -> .x/ (static HTML + server bundle + manifest)
x start     # run the production server from .x/
```

Deploys to anywhere Bun runs — Docker, Fly.io, Railway, a VPS.

## Config

Everything's optional, `x.config.ts` just lets you override defaults:

```ts
export default defineConfig({
  pagesDir: "src/pages",
  layoutsDir: "src/layouts",
  apiDir: "src/api",
  actionsDir: "src/actions",
  contentDir: "content",
  port: 3000,
});
```

## Links

- Docs: https://thexjs.vercel.app/docs
- Repo: https://github.com/abdelkabirouadoukou/x
- Install: `bun create thexjs-app@latest`

MIT licensed. Not production-ready yet — this is a solo learning project, feedback and issues are welcome.