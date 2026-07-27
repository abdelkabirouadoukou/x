import { createApp } from "@x/core";

const app = await createApp({
  pagesDir: `${import.meta.dir}/src/pages`,
  layoutsDir: `${import.meta.dir}/src/layouts`,
  apiDir: `${import.meta.dir}/src/api`,
  actionsDir: `${import.meta.dir}/src/actions`,
  contentDir: `${import.meta.dir}/content`,
  development: true,
});

const server = Bun.serve(app);

console.log(`[x] example running at ${server.url}`);
