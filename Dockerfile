FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/core/package.json packages/core/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY examples/basic/package.json examples/basic/package.json
RUN bun install --frozen-lockfile
COPY . .
RUN bun run --cwd packages/core typecheck
RUN bun packages/cli/src/index.ts build

FROM oven/bun:1 AS production
WORKDIR /app
COPY --from=build --chown=bun:bun /app/dist ./dist
USER bun
EXPOSE 3000
CMD ["bun", "dist/server/index.js"]
