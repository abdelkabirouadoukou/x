---
"@thexjs/core": minor
---

Migration runners (`runSQLiteMigrations` / `runPostgresMigrations`) now
record a sha256 checksum of each migration file in `_x_migrations.checksum`
alongside the name, and detect drift when an already-applied file is edited:

- `_x_migrations.checksum` is stored on apply and backfilled for existing
  deployments (`ADD COLUMN` via pragma probe on SQLite, `IF NOT EXISTS` on
  Postgres).

- On re-run, applied files whose content no longer matches the stored
  checksum are reported in the new `result.drifted` array and logged with a
  warning by default. Pass `{ onDrift: "fail" }` to abort instead of
  continuing with a mismatched schema.

- Migrations recorded before checksums existed show up in the new
  `result.unknownContent` array and are only warned on — never failed — so
  existing deployments keep booting quietly while being made aware of the
  unverifiable history.

- Both result types gain `drifted` / `unknownContent` and now always include
  them (previously `drifted`/`unknownContent` did not exist).