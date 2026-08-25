---
"@thexjs/auth": patch
---

Align the SQLite session store's upsert to match the Postgres store: `INSERT OR REPLACE` overwrites `created_at` on token conflict; the explicit `ON CONFLICT (token) DO UPDATE` form now leaves it untouched, matching Postgres's contract. Fixes #175.
