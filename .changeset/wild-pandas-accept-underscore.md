---
"@thexjs/adapter-vercel": patch
---

Accept underscores in forwarded Host/proto header validation. Internal/corporate DNS zones commonly use underscore hostnames (e.g. `api_team.corp.local`); the generated Vercel entry's forwarded-header validator previously rejected them, silently falling back to connection metadata. The character class still fails closed on everything else (spaces, commas, control characters). Fixes #179.
