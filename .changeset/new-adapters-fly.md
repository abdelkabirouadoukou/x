---
"@thexjs/core": patch
---

The Vercel adapter (`x build --adapter vercel`) now computes correct
server-action names for batched action modules (`export const actions = { greet, farewell }`).

Previously `fnNames` was derived from `Object.keys(actionMod)` alone, which yields
`["actions"]` for the batched pattern — so the generated client stub exported a function
literally named `actions` and a browser island doing `import { greet }` silently got
`undefined`. The scanner now mirrors `createApp`/`build`: each key of a batched `actions`
export is registered as a function, and individually-named function exports are included
too. `ResolvedAction` gains an optional `fnNames` field carrying the client-visible names.