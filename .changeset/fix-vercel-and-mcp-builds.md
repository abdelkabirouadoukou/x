---
"@thexjs/core": patch
"@thexjs/mcp": patch
---

Fix CI and Vercel builds:

- Treat Vercel's non-secret `VERCEL_HASH_SALT` timestamp as safe in the
  client-bundle value scan. Its short numeric value collides with numbers in
  bundled JS, which previously failed every Vercel deployment with a false
  `EnvLeakageError`.
- Emit the `x-routes.ts` `href()` helper in Biome-formatted form so regenerating
  the manifest in dev doesn't make `biome check` fail.
- Upgrade `@thexjs/mcp` to Zod 4, matching the MCP SDK's resolved Zod version.
  The previous dual Zod 3/Zod 4 type graph made `tsc`/`tsup --dts` fail with
  `TS2589: Type instantiation is excessively deep and possibly infinite`.
