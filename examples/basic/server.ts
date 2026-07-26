import { createApp } from "@x/core";

const app = await createApp({
  routesDir: `${import.meta.dir}/src/routes`,
  development: true,
});

const server = Bun.serve(app);

console.log(`[x] example running at ${server.url}`);
