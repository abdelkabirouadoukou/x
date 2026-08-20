<p align="center">
  <a href="#">
    <img src="./examples/landing/public/favicon.ico" alt="x framework logo" width="120" height="120">
  </a>
</p>

<p align="center">
A full-stack React framework built on top of Bun. It has file-based routing, API routes, server functions, and SSR/static rendering. All of that runs in one process instead of five different tools combined.
</p>

<p align="center">
<a href="#quick-start"><img src="https://img.shields.io/badge/Bun-1.0+-black?style=flat-square&logo=bun" alt="Bun Ready"></a>
<a href="#features"><img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19"></a>
<a href="#features"><img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript" alt="TypeScript"></a>
<a href="./ROADMAP.md"><img src="https://img.shields.io/badge/Status-Maintenance-yellow?style=flat-square" alt="Status"></a>
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

That's x. I'm 18, and this is the first framework I've tried to design. Most of the work was me figuring things out as I went, not following a specific plan.

## What was hard

I'd never designed a framework before this, so I spent time reading how Next.js, Astro, and Remix set up their routing and rendering before writing any code. The bundler was the part that really gave me trouble in getting the client/server boundary right. I wanted to make sure a `DATABASE_URL` or `STRIPE_SECRET_KEY` didn't accidentally end up in the browser bundle. It took a few rewrites to get that right.

I kept a `TASKS.md` file in the repo the whole time. That way, I had something to refer to when I lost track of what "done" meant. It's still in the history if you want to see how the scope changed. There were also a few nights when I was tired and pushed through code without thinking it through completely. I had to go back later and clean some of that up.

## What I'm proud of

Deploy speed. I push a commit, refresh the site, and it’s already live. That never happened to me on Next.js or Vercel, where deploys took a long time. I’m also pleased with how the split feels in practice. It’s Astro-like on the frontend and Next.js-like on the backend, both running through Bun instead of on top of it.

## Try it

This started as an experiment to learn how frameworks actually work underneath, and to solve a real problem I had. It's a solo project — use it for learning, poking around, or build something small on it, but treat it as curiosity software, not a production dependency.

```bash
bun create thexjs-app@latest my-app
cd my-app
bun run dev
```

The scaffolder is feature-based: it asks which features you want (`tailwind`, `auth`, `content`, `hooks`, `shadcn`) — pick nothing for a blank home page, then the dev server runs at `http://localhost:3000`. Pass features non-interactively with flags like `--tailwind --auth`; `--no-install` and `--no-git` skip the install/init steps.

In maintenance mode (author busy with the collage), releases, reviews, and merges happen on a best-effort weekly cadence — see [ROADMAP.md](ROADMAP.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## What's inside

```
packages/core                 file-based router, SSR renderer, middleware
packages/cli                  x dev / x build / x start
packages/env                  typed env variable validation
packages/auth                 credentials + OAuth2/GitHub auth, sessions, CSRF
packages/hooks                client-side hook helpers (useSession, usePageData, ...)
packages/adapter-vercel       Vercel Build Output API adapter
packages/create-thexjs-app    the scaffolder (bun create thexjs-app@latest)
examples/default              minimal starter
examples/basic                pages, API routes, auth, dashboard
examples/landing              the docs site
examples/blog                 blog w/ content collections
examples/saas                 saas dashboard demo
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

export default function BlogPost({ loaderData }: RouteProps) {
  return <h1>{String(loaderData?.title)}</h1>;
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

```ts
export async function GET(req: Request) {
  const users = await db.query("SELECT * FROM users").all();
  return Response.json(users);
}
```

## Server functions

Write a normal async function in `src/actions/`, call it from the browser without hand-writing a REST endpoint:

```ts
// src/actions/greet.ts
export async function greet(name: string) {
  return `Hello, ${name}!`;
}
```

At runtime, `registerServerFunctions()` stores the real function (closure, db access, everything) in an in-memory route table (`ACTION_ROUTES`). A single `Bun.serve()` handler (`getServerFunctionHandler`) matches incoming `POST /__x/actions/<path>/<fnName>` requests against that table, runs a CSRF check, parses the JSON body as args, calls the real function, and returns the JSON result (or a `500` if it throws).

The client never sees that function body. When an island or component imports from `src/actions/*`, the bundler swaps the import for a generated fetch wrapper instead of bundling the real file:

```ts
// what actually ships to the browser for `import { greet } from "../actions/greet"`
export async function greet(...args: unknown[]): Promise<unknown> {
  const res = await fetch("/__x/actions/greet/greet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

That swap happens in a `Bun.build()` plugin (`actionsRewritePlugin`) that intercepts any import resolving to a registered action file and rewrites its contents before the client bundler ever reads the real source so the db calls and secrets inside `greet.ts` are structurally excluded from the client bundle, not just hidden by convention. You can still import the same function directly inside a loader or API route, since those run server-side in the same process.

### Client/server boundary in practice

Getting this boundary right (making sure `DATABASE_URL` or `STRIPE_SECRET_KEY` never end up in a browser bundle) was the hardest part of building this. Two things enforce it:

1. **Build-time interception**: the `actionsRewritePlugin` above means server-function bodies are never even parsed by the client-target bundler.
2. **A leak scanner as a safety net**: after each island bundle is built, `assertNoEnvLeakage()` runs a regex scan (not an AST pass worth being precise about that) over the final bundled JS text, looking for `process.env.X`, `Bun.env.X`, or `import.meta.env.X`. Anything not prefixed `THEXJS_PUBLIC_` fails the build with an `EnvLeakageError`. It's a simple, fast check on the compiled output rather than a structural understanding of the code, so it catches the common cases but isn't meant to be un-fool-able (e.g. `Bun["e" + "nv"]` would slip past a naive regex) the interception above is what actually makes the leak impossible, the scanner just double-checks it.

Island bundling itself happens in memory: for a route with islands, a scratch hydration entry file is written to a temp dir, bundled with `Bun.build({ target: "browser" })` (React/ReactDOM external), scanned, and the temp dir is deleted immediately after nothing lands in the project tree.

This boundary is the part I rewrote the most times. Early on I only had the
scanner, no interception, and a bug in the regex was the only thing
standing between a real project and a leaked API key. Moving the real
protection to build time (so the secret-holding code is never even read by
the client bundler) and keeping the scanner as a second check, not the only
check, is the version I'd actually trust in a project with real users.

## Content collections

Markdown + frontmatter in, pages out:

```ts
const posts = scanContent("posts");
const html = renderMarkdown(post.body);
```

## Client navigation & images

Every `<a>` tag gets SPA-style client-side navigation and hover prefetch automatically, no router setup required. Opt out per-link with `data-no-nav` / `data-no-prefetch`, or use the typed `<Link>` wrapper. A built-in `/_x/image` proxy streams allow-listed remote images through your own origin so a strict `img-src 'self'` CSP still works with external images:

```tsx
import { Link, createImageProxyHandler } from "@thexjs/core";

<Link href="/docs">Docs</Link>

const imageProxy = createImageProxyHandler({ remoteHosts: ["cdn.example.com"] });
```

### `<Image>` (next/image-equivalent)

`@thexjs/core` ships an `<Image>` component that gets the parts of
`next/image` that earn their keep without a build-time optimization pipeline:

- **Responsive `srcset`/`sizes`** — remote images render width variants
  (`&w=320` … `&w=3840`) through the `/_x/image` proxy.
- **Auto remote-routing** — an absolute `src` whose host is in
  `x.config.ts` `images.remoteHosts` is rewritten to the proxy automatically;
  local/relative `src` passes through untouched.
- **`priority`** — skips `loading="lazy"`, adds `fetchpriority="high"` for
  LCP images.
- **`fill`** — absolute-positioned `object-fit: cover` for hero/card layouts.
- **`placeholder="blur"`** — optional `blurDataURL` shown as a CSS background
  until the real image loads (no JS island needed).
- **Dev warnings** — missing width/height (CLS), `fill`+dimensions conflict,
  and remote hosts absent from `images.remoteHosts` (would 403).

```tsx
import { Image } from "@thexjs/core";

<Image
  src="https://cdn.example.com/team.jpg"
  alt="The team"
  width={1600}
  height={900}
  priority
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

`alt` is required. Format `<picture>` sources and resizing are reserved for a
future optimization pipeline — the proxy currently passes images through
unresized but validates `w`/`q` hints so the component API is stable.

## Middleware

Drop a `_middleware.ts` in any pages folder it runs for that folder and everything under it. Useful for auth checks, redirects, logging.

## Authentication

`@thexjs/auth` adds credentials (username/password) and OAuth2 (including a GitHub preset) sign-in with one `defineAuth()` call. Passwords are hashed with Argon2 via `Bun.password`, session tokens are HMAC'd at rest and revocable, sessions live in SQLite or Postgres through the data layer, and auth POST endpoints run the core CSRF module automatically. Mount it on a single catch-all API route:

```ts
import { defineAuth, createSQLiteSessionStore } from "@thexjs/auth";

export const auth = defineAuth({
  secret: process.env.AUTH_SECRET!,
  store: createSQLiteSessionStore(),
  providers: [{ id: "github", name: "GitHub", type: "oauth", clientId: "...", clientSecret: "..." }],
});

// api/auth/[...auth].ts — forward GET/POST to auth.handleRequest(req)
```

See [packages/auth/README.md](packages/auth/README.md) for the endpoint map (`/api/auth/signin/:id`, `/callback/:id`, `/signout`, `/session`) and `getSession()` usage.

## Data layer

Built-in SQLite (`connectSQLite`, zero config, good for dev) and Postgres (`connectPostgres`, connection pooling, for production) with versioned migrations for both.

## Build & deploy

```bash
x build     # -> .x/ (static HTML + server bundle + manifest)
x start     # run the production server from .x/
```

Deploys to anywhere Bun runs Docker, Fly.io, Railway, a VPS.

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

## Versioning

Packages follow [semver](VERSIONING.md) and are pre-1.0 in spirit: the
public API is still settling, so expect breaking changes between minor
releases. Pin exact versions if stability matters to you.

- Releases are managed with **Changesets**. Every PR touching a `packages/*`
  package adds a changeset (`bun changeset`), which bumps versions and writes
  changelogs when merged to `main`.
- The release GitHub Action (`publish` on `main`) creates a versioning PR and
  publishes to npm on merge.
- Currently published: `@thexjs/core` (1.6.x), `@thexjs/cli` (1.1.x),
  `@thexjs/env` (1.x), `@thexjs/auth` (3.x), `@thexjs/hooks` (0.x),
  `@thexjs/adapter-vercel` (1.0.x), `create-thexjs-app` (1.x).

## Known limitations

- **Unstable API**: everything above is subject to change. Treat pre-1.0 packages
  (and any untagged minor in 1.x/3.x) as potentially breaking.
- **Bun-only**: the framework runs on Bun (runtime, bundler, package manager).
  There is no Node.js target.
- **Content collections** and the **data layer** (SQLite/Postgres migrations)
  work but have the least test coverage in the framework; the image proxy and
  server-actions runtime are covered, the build toolchain is exercised via the
  Vercel adapter and CLI integration tests.
- **Route-level test coverage is newest**: the request pipeline, server
  functions, env validation, and the Vercel adapter all gained tests in the
  latest pass; remaining gaps are documented in `ROADMAP.md`.

## Links

- Docs: https://thexjs.vercel.app/docs
- Repo: https://github.com/abdelkabirouadoukou/x
- Security: [SECURITY.md](SECURITY.md)
- Threat model: [THREAT_MODEL.md](THREAT_MODEL.md)
- Data retention & deletion: [DATA_POLICIES.md](DATA_POLICIES.md)
- Support & versioning: [SUPPORT.md](SUPPORT.md), [VERSIONING.md](VERSIONING.md)
- Benchmarks & SLOs: [BENCHMARKS.md](BENCHMARKS.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Install: `bun create thexjs-app@latest`

MIT licensed. Not production-ready yet this is a solo learning project, feedback and issues are welcome.