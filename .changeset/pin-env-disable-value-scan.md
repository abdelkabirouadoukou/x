---
"@thexjs/core": patch
---

Pin `env: "disable"` on browser-target island `Bun.build()` calls and add a
literal-value scan (`findLeakedEnvValues`) alongside the existing
`process.env.X` syntax scan, so a non-public environment variable's value
still gets caught even if it were ever inlined into the bundle as a string
literal instead of left as a reference.
