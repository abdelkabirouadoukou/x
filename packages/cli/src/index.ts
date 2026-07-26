#!/usr/bin/env bun
/**
 * Placeholder. `x dev` / `x build` / `x start` are Phase 7 in TASKS.md —
 * not implemented yet. For now, run an app's own server.ts directly, e.g.:
 *
 *   bun --hot examples/basic/server.ts
 */
const [command] = Bun.argv.slice(2);

console.log(`[x] "${command ?? "<none>"}" isn't implemented yet.`);
console.log("For now: bun --hot examples/basic/server.ts");
process.exit(1);
