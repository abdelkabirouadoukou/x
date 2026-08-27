/**
 * Generic bounded LRU cache backed by a plain `Map`.
 *
 * Uses Map insertion order to track recency: every read re-inserts the entry
 * (delete + set), pushing it to the back. On writes, entries are evicted from
 * the front (oldest-first) once `maxEntries` is exceeded.
 */
export class BoundedCache<K, V> {
  private readonly entries = new Map<K, V>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get(key: K): V | undefined {
    const value = this.entries.get(key);
    if (value !== undefined) {
      // LRU touch: re-insert so it survives longer than less-recently-used
      // entries when the cap is hit.
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    this.evict();
  }

  delete(key: K): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  private evict(): void {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }
}
