# Deploying x apps

x apps deploy as a single server process with a static assets directory — no Node.js, no
build-time server. Just `x build --outDir dist` + `bun dist/server/index.ts`.

## Prerequisites

- [Bun](https://bun.sh) 1.3.x or later (build + runtime)
- A project using `@thexjs/core` with at least one route

## Build

```sh
x build --outDir dist
```

This produces:
- `dist/client/` — fully static assets (HTML, island JS chunks, content pages)
- `dist/server/index.ts` — the generated server entry, run directly with `bun`

`--outDir` defaults to `.x/` if omitted.

## Run in production

`x start` serves whatever `x build` produced. If you built with `--outDir dist`,
point `start` at the same directory:

```sh
x start --outDir dist
```

Or directly:

```sh
NODE_ENV=production bun dist/server/index.ts
```

> If you omit `--outDir`, both commands default to `.x/` and stay consistent.

## Docker

A `Dockerfile` is provided at the project root. Build and run:

```sh
docker build -t my-x-app .
docker run -p 3000:3000 my-x-app
```

## Deploy to Vercel

Each example app ships a `vercel-build` script (`x build --adapter vercel`) that
emits a Build Output API v3 tree (`.vercel/output/`) — no `vercel.json` needed.
Two ways to wire it up:

### Option 1 (recommended): rootDirectory per app

In the Vercel project, set **Root Directory** to the app you're deploying, e.g.
`examples/basic` (the same setup `examples/landing` uses for thexjs.vercel.app).
Vercel then runs `bun install` + `bun run vercel-build` inside that directory.

### Option 2: deploy from the repo root

The root `package.json` has a `vercel-build` script that builds `examples/basic`
in place (where `node_modules` resolve — the render function must live inside
the app tree) and stages the result to the repo-root `.vercel/output`:

```sh
bun run vercel-build
```

> **Why the staging step?** The adapter bundles the SSR render function by
> walking up from its output directory to find `node_modules`. That only works
> when `.vercel/output` sits inside the app's tree, so the root script builds in
> `examples/basic/.vercel/output` (where `@thexjs/*` resolve) and copies the
> self-contained output to the root afterward. Point Vercel at the repo root if
> you use this option.

## Deploy to Fly.io

1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. Create a `fly.toml`:

```toml
app = "my-x-app"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
```

3. Launch:

```sh
fly launch --no-deploy
fly deploy
```

## Deploy to a VPS

1. Build locally (so the artifacts land in `dist/`):

```sh
x build --outDir dist
```

2. Copy `dist/` to the server:

```sh
rsync -avz dist/ user@host:/opt/my-x-app/dist
```

3. Run (use a process manager like `systemd` or `pm2`):

```ini
# /etc/systemd/system/my-x-app.service
[Unit]
Description=my-x-app
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/my-x-app
ExecStart=/usr/local/bin/bun dist/server/index.ts
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```sh
systemctl enable --now my-x-app
```

## Environment

| Variable     | Default | Description                              |
|-------------|---------|------------------------------------------|
| `PORT`      | `3000`  | HTTP port the server listens on          |
| `NODE_ENV`  | `production` | Set to `development` for dev mode    |

## Architecture

```
dist/
  client/           # Static assets — serve from any static file server
    index.html
    _islands/*.js   # Per-island hydration bundles
    blog/hello/index.html
  server/
    index.ts        # Generated server entry (Bun.serve with routes + API + SSR)
```

You can serve `dist/client/` from a CDN or reverse proxy (nginx, Fly CDN, etc.)
and forward API/SSR requests to the server process.

> **Docker tip:** `docker build` emits the build to `./dist` (the Dockerfile runs
> `x build --outDir dist`), so the image's `CMD` is `bun dist/server/index.ts`.
