---
"@thexjs/env": minor
---

Add `optional()` and `default()` combinators to every built-in env validator:

- `num().optional()` → `number | undefined`, missing variable no longer fails
  validation; a present but invalid value still throws
- `num().default(3000)` → `number`, missing variable yields the fallback; a
  present but invalid value still throws
- Combinators chain, e.g. `oneOf(["dev", "prod"] as const).default("dev")`

Missing optional vars now pass through `createEnv` instead of failing the
whole validation, so legitimately-optional variables (feature flags,
`SENTRY_DSN`, …) no longer need empty placeholder values.