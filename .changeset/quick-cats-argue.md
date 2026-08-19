---
"@thexjs/core": patch
---

Request body size limit (#109):

- `createApp` gains a `maxBodySize` option (default 1 MiB), enforced ahead of
  route/action dispatch across every body-reading surface: `/api/*` routes,
  `/__x/actions/*` server functions, `/__x/revalidate`, and hydration-mismatch
  beacons.
- Requests whose `Content-Length` exceeds the limit are rejected immediately
  with 413. Chunked requests without a `Content-Length` are wrapped in a
  counting stream that errors with `RequestBodyTooLargeError` (mapped to 413 by
  the dispatch paths) the moment the limit is crossed, aborting the body before
  it is fully buffered. Previously an attacker could POST an arbitrarily large
  body and drive the single Bun process toward OOM.
- `enforceRequestBodySize` and `RequestBodyTooLargeError` are exported from
  `@thexjs/core`.
