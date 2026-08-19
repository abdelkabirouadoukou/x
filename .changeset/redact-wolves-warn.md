---
"@thexjs/core": patch
---

Log redaction (half of #79):

- `@thexjs/core` now ships a redaction pass (`redact.ts`) applied inside the
  structured logger's `write()`: fields under sensitive key names (`password`,
  `token`, `secret`, `authorization`, `cookie`, `session`, `apiKey`, ...,
  case-insensitive substring match) are replaced with `[REDACTED]`, nested
  objects/arrays are walked recursively, and string values are scanned for
  embedded `Bearer`/`Basic` tokens and inline `Authorization:` values.
- `withRequestLogging`'s catch block now redacts caught-error `.message`
  strings before emission, so a driver or app error that embeds a secret can
  never leak it into the log sink.
- This is belt-and-suspenders beside the build-time env-leak scanner: that one
  protects client bundles, this one protects server logs, in dev and prod.
