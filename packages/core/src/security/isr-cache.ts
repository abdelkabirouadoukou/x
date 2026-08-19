/**
 * ISR (revalidate) cache with a bounded size and in-flight dedup.
 *
 * Two problems this solves over a plain `Map`:
 *
 * 1. **Unbounded growth** — cached HTML for every distinct URL ever requested
 *    would otherwise live for the life of the process. Entries are capped at
 *    `maxEntries` and evicted oldest-first (LRU via Map insertion order).
 *
 * 2. **Cache stampede** — N concurrent misses for the same URL all ran the
 *    loader and rendered. `getOrCompute` shares one in-flight computation
 *    across all waiters, so a busy page rebuilds its entry exactly once.
 *
 * Keys are full URLs (pathname + search). The caller is responsible for that
 * contract; see `isrCacheKey`.
 */
export interface StaticCacheEntry {
  html: string;
  timestamp: number;
}

export class IsrCache {
  private readonly entries = new Map<string, StaticCacheEntry>();
  private readonly inFlight = new Map<string, Promise<string | Response>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get(key: string): StaticCacheEntry | undefined {
    const entry = this.entries.get(key);
    if (entry) {
      // LRU touch: re-insert so it survives longer than less-recently-used
      // entries when the cap is hit.
      this.entries.delete(key);
      this.entries.set(key, entry);
    }
    return entry;
  }

  set(key: string, html: string): void {
    this.entries.delete(key);
    this.entries.set(key, { html, timestamp: Date.now() });
    this.evict();
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  /** Deletes every entry whose pathname matches (query-blind purge). */
  deletePath(pathname: string): number {
    let removed = 0;
    for (const key of this.entries.keys()) {
      const url = new URL(key, "http://localhost");
      if (url.pathname === pathname) {
        this.entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  get size(): number {
    return this.entries.size;
  }

  /**
   * Returns the cached HTML for `key`, or runs `compute` exactly once — even
   * when multiple callers miss concurrently — and caches the result. A
   * `Response` returned by `compute` (e.g. a loader redirect) is passed
   * through and never cached.
   */
  getOrCompute(key: string, compute: () => Promise<string | Response>): Promise<string | Response> {
    const cached = this.get(key);
    if (cached) return Promise.resolve(cached.html);

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const promise = compute()
      .then((result) => {
        if (typeof result === "string") {
          this.set(key, result);
        }
        return result;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, promise);
    return promise;
  }

  private evict(): void {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }
}

/** Full-URL cache key (pathname + search) — query strings are part of the key. */
export function isrCacheKey(requestUrl: string): string {
  const url = new URL(requestUrl);
  return url.pathname + url.search;
}
