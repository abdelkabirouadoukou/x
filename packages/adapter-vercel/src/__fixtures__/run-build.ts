import { buildVercelOutput } from "../index";

const [projectRoot, outputDir, pagesDir, apiDir] = process.argv.slice(2);
if (!projectRoot || !outputDir || !pagesDir || !apiDir) {
  console.error("usage: run-build.ts <projectRoot> <outputDir> <pagesDir> <apiDir>");
  process.exit(1);
}

await buildVercelOutput({ projectRoot, outputDir, pagesDir, apiDir });
