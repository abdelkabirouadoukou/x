/**
 * Generates public/llms.txt (index) and public/llms-full.txt (full content)
 * from the same DOCS object that powers the @thexjs/mcp server, so the two
 * never drift out of sync. Follows the llms.txt convention
 * (https://llmstxt.org) so agents with web access (not just MCP access) can
 * fetch grounded x framework docs directly.
 *
 * Run as part of the landing build (see package.json "build" script).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DOCS, listTopics } from "@thexjs/mcp/docs";

const ROOT = join(import.meta.dirname, "..");

/**
 * Every dir that can hold the built client output. The build script runs
 * this generator AFTER `x build`, and x build copies public/ into the
 * client output at build time — so files written only to public/ here would
 * miss deployment. Publish into every existing client dir plus public/,
 * mirroring gen-docs-search.ts.
 */
const CLIENT_CANDIDATES = [
  join(ROOT, ".vercel", "output", ".scratch-core", "client"),
  join(ROOT, ".vercel", "output", "static"),
  join(ROOT, ".x", "client"),
];

function buildLlmsTxt(): string {
  const lines: string[] = [];
  lines.push("# x");
  lines.push("");
  lines.push(
    "> A full-stack React framework built on Bun. File-based routing, API " +
      "routes, server functions, and SSR/static rendering in one process.",
  );
  lines.push("");
  lines.push(
    "x looks similar to Next.js / Remix / Astro / TanStack Start in places " +
      "but is NOT any of them. See llms-full.txt for the full reference, " +
      "including explicit corrections for conventions agents most often " +
      "guess wrong (loaders, server actions, env var prefixing).",
  );
  lines.push("");
  lines.push("## Docs");
  lines.push("");
  for (const topic of listTopics()) {
    lines.push(
      `- [${topic.title}](https://thexjs.vercel.app/llms-full.txt#${topic.id}): ${topic.summary}`,
    );
  }
  lines.push("");
  lines.push("## MCP");
  lines.push("");
  lines.push(
    "- Agents with MCP tool access should prefer the `@thexjs/mcp` server " +
      "(`bunx @thexjs/mcp`) over this file — it's queryable and includes a " +
      "`scaffold_file` tool. See https://github.com/abdelkabirouadoukou/x/tree/main/packages/mcp",
  );
  lines.push("");
  return lines.join("\n");
}

function buildLlmsFullTxt(): string {
  const lines: string[] = [];
  lines.push("# x — full reference");
  lines.push("");
  for (const [id, doc] of Object.entries(DOCS)) {
    lines.push(`<a id="${id}"></a>`);
    lines.push(`## ${doc.title}`);
    lines.push("");
    lines.push(doc.content);
    lines.push("");
  }
  return lines.join("\n");
}

function main(): void {
  const clientDirs = CLIENT_CANDIDATES.filter(existsSync);
  const outDirs = [join(ROOT, "public"), ...clientDirs];
  for (const dir of outDirs) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "llms.txt"), buildLlmsTxt());
    writeFileSync(join(dir, "llms-full.txt"), buildLlmsFullTxt());
  }
  console.log(
    `[gen-llms-txt] wrote llms.txt + llms-full.txt to ${outDirs.length} location(s): public/${clientDirs.length > 0 ? " + built client dirs" : ""}`,
  );
}

main();
