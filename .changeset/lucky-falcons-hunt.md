---
"@thexjs/core": patch
---

Fix several correctness and security bugs found in the bug hunt:

- **Image proxy**: blocked serving `image/svg+xml` (SVGs served from the app's
  own origin could execute scripts with origin privileges) and hardened
  redirects — automatic redirect-following was removed, each hop is now
  re-checked against the host allow-list, and the hop count is capped. Blocks
  an allow-listed origin redirecting to internal/metadata endpoints (SSRF).
- **ISR**: the render cache was keyed by the route *pattern* (e.g.
  `/blog/[slug]`), so every dynamic URL on that pattern shared one cached page
  and leaked content across URLs. Cache entries are now keyed by the concrete
  URL, and the cache is checked before the loader runs so hits skip data
  fetching entirely.
- **`/__x/revalidate`**: the unauthenticated cache-purge endpoint now runs the
  same CSRF/origin check as server actions, so a cross-site POST can no longer
  purge the ISR cache.
- **Route ordering**: handlers are now sorted static-first so a literal route
  (e.g. `/posts/new`) isn't shadowed by a dynamic `/posts/[id]` depending on
  directory scan order.
- **Dynamic-route params**: params extracted from the URL are now
  percent-decoded (`hello%20world` arrives as `hello world`).
- **Migrations**: migration files are sorted numerically by leading prefix
  (`10_x.sql` no longer runs before `2_x.sql`).
- **Postgres**: a connection probe that failed at boot used to be memoized as
  a permanently rejected promise, wedging the client even after the database
  recovered. The memo now resets on failure so the next query re-probes.