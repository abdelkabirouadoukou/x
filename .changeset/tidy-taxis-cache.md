---
"@thexjs/core": patch
---

Make the ISR cache key-safe, bounded, and stampede-proof:

- Cache keys are now the full URL (pathname + query string), so `/search?q=alpha` and `/search?q=beta` on the same ISR route never serve each other's HTML.
- Cache is an `IsrCache` with a 500-entry LRU cap instead of an unbounded `Map`, evicting least-recently-used entries first.
- Concurrent misses for the same URL share one in-flight render (`getOrCompute`), so a stampede rebuilds the entry exactly once.
- Revalidate-by-path plumbs the new key scheme: it purges every query variant under a pathname, and a Response from a loader (e.g. redirect) is passed through without being cached.