---
"@thexjs/core": patch
---

Escape regex metacharacters in static route segments (closes #113):

- `routePatternToRegex` now escapes `.`, `+`, `(`, `)`, `?`, `[`, `]`, `^`,
  `$`, `{`, `}`, `|`, `\` in literal segments before expanding `:param`/`*`
  tokens, so a folder named `v1.2` matches only `/v1.2` (previously the `.`
  matched any character and `/v1x2` also hit the route). Both page routing
  (`extractParams`) and server actions (`extractActionParams`) share this
  function, so both surfaces are fixed.
- Regression tests for the full metacharacter set on the page-routing side and
  for `.`/`+` on the server-action side; dynamic `:param`/`*` tokens still
  capture as before.