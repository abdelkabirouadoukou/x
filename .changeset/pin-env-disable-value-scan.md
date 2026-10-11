---
"@thexjs/core": patch
---

Pin `env: "disable"` on browser-target island `Bun.build()` calls and add a
literal-value scan (`findLeakedEnvValues`) alongside the existing
`process.env.X` syntax scan, so a non-public environment variable's value
still gets caught even if it were ever inlined into the bundle as a string
literal instead of left as a reference. The value scan only checks
sensitive-looking variable names (`SECRET`, `TOKEN`, `PASSWORD`, `API_KEY`,
etc.) or random-looking values, so it doesn't fail real builds over ordinary
values like `VERCEL_ENV=production` coincidentally matching other bundle
text.
