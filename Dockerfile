# syntax=docker/dockerfile:1

# Build stage — install workspace deps, typecheck, and emit the production build.
# `x build --outDir dist` so the Dockerfile can COPY ./dist (matches DEPLOY.md).
FROM oven/bun:1 AS build
WORKDIR /app

# Copy lockfile + every workspace package.json first so `bun install` can run
# with full layer caching (any new workspace just needs its package.json added).
COPY package.json bun.lock ./
COPY packages/core/package.json packages/core/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/adapter-vercel/package.json packages/adapter-vercel/package.json
COPY packages/create-thexjs-app/package.json packages/create-thexjs-app/package.json
COPY examples/basic/package.json examples/basic/package.json
COPY examples/default/package.json examples/default/package.json
COPY examples/blog/package.json examples/blog/package.json
COPY examples/landing/package.json examples/landing/package.json
COPY examples/saas/package.json examples/saas/package.json
RUN bun install --frozen-lockfile

COPY . .

# Typecheck the workspace, then build the basic example. `--cwd examples/basic`
# makes projectDir /app/examples/basic, so `--outDir ../../dist` resolves to
# /app/dist (matching the COPY below and DEPLOY.md).
RUN bun run typecheck
RUN bun packages/cli/src/index.ts build --outDir ../../dist --cwd examples/basic
FROM oven/bun:1 AS production
WORKDIR /app
COPY --from=build --chown=bun:bun /app/dist ./dist
ENV NODE_ENV=production
USER bun
EXPOSE 3000
CMD ["bun", "dist/server/index.ts"]
