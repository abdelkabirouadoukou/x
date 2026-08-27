---
"@thexjs/core": patch
---

Bound the island-bundle caches (`islandBundleCache` and `islandFileCache`) in `createApp` with an LRU eviction strategy via a new generic `BoundedCache<K,V>` class. Previously these plain `Map`s grew unbounded for the lifetime of the process, accumulating full bundled JS strings. They now cap at 500 entries by default (configurable via `CreateAppOptions.islandCacheMaxEntries`). Closes #159.
