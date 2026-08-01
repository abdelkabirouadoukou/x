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

```sh
x start
```

Or directly:

```sh
NODE_ENV=production bun dist/server/index.ts
```

## Docker

A `Dockerfile` is provided at the project root. Build and run:

```sh
docker build -t my-x-app .
docker run -p 3000:3000 my-x-app
```

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

1. Build locally:

```sh
x build
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
