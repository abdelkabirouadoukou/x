---
"@thexjs/adapter-vercel": patch
---

Default the generated Vercel function runtime to `nodejs22.x`. Vercel has discontinued `nodejs20.x`, so deployments built with the previous default were rejected at the "Deploying outputs" step even though the build succeeded. Passing `runtime` explicitly still overrides the default.
