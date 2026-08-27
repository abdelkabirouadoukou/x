import { describe, expect, test } from "bun:test";
import { BoundedCache } from "./bounded-cache";

describe("BoundedCache", () => {
  test("grows normally under maxEntries", () => {
    const cache = new BoundedCache<string, string>(5);
    for (let i = 0; i < 5; i++) cache.set(`k${i}`, `v${i}`);
    expect(cache.size).toBe(5);
    for (let i = 0; i < 5; i++) expect(cache.get(`k${i}`)).toBe(`v${i}`);
  });

  test("evicts oldest entry past maxEntries (LRU)", () => {
    const cache = new BoundedCache<string, string>(3);
    cache.set("/1", "one");
    cache.set("/2", "two");
    cache.set("/3", "three");
    expect(cache.size).toBe(3);

    // Adding a 4th entry evicts the oldest (/1).
    cache.set("/4", "four");
    expect(cache.size).toBe(3);
    expect(cache.get("/1")).toBeUndefined();
    expect(cache.get("/2")).toBe("two");
    expect(cache.get("/3")).toBe("three");
    expect(cache.get("/4")).toBe("four");
  });

  test("reading an entry makes it most-recently-used", () => {
    const cache = new BoundedCache<string, string>(3);
    cache.set("/a", "alpha");
    cache.set("/b", "bravo");
    cache.set("/c", "charlie");

    // Touch /a so it becomes MRU — next eviction should target /b.
    expect(cache.get("/a")).toBe("alpha");
    cache.set("/d", "delta");

    expect(cache.get("/a")).toBe("alpha");
    expect(cache.get("/b")).toBeUndefined();
    expect(cache.get("/c")).toBe("charlie");
    expect(cache.get("/d")).toBe("delta");
  });

  test("high volume of distinct keys never exceeds maxEntries", () => {
    const max = 100;
    const cache = new BoundedCache<number, string>(max);
    for (let i = 0; i < 10_000; i++) cache.set(i, `val-${i}`);
    expect(cache.size).toBe(max);

    // The last max entries should still be present.
    for (let i = 10_000 - max; i < 10_000; i++) {
      expect(cache.get(i)).toBe(`val-${i}`);
    }
    // Earlier entries should have been evicted.
    expect(cache.get(0)).toBeUndefined();
  });

  test("delete removes a specific entry", () => {
    const cache = new BoundedCache<string, string>(5);
    cache.set("/x", "x");
    cache.set("/y", "y");
    cache.delete("/x");
    expect(cache.size).toBe(1);
    expect(cache.get("/x")).toBeUndefined();
    expect(cache.get("/y")).toBe("y");
  });

  test("clear empties the cache", () => {
    const cache = new BoundedCache<string, string>(5);
    cache.set("/a", "a");
    cache.set("/b", "b");
    cache.clear();
    expect(cache.size).toBe(0);
  });

  test("get returns undefined for missing keys (LRU touch is no-op)", () => {
    const cache = new BoundedCache<string, string>(3);
    cache.set("/1", "one");
    expect(cache.get("/missing")).toBeUndefined();
    expect(cache.size).toBe(1);

    // Add two more, then one more to trigger eviction.
    cache.set("/2", "two");
    cache.set("/3", "three");
    cache.set("/4", "four");

    // /1 is oldest and should be evicted.
    expect(cache.get("/1")).toBeUndefined();
  });

  test("overwriting an existing key does not grow size", () => {
    const cache = new BoundedCache<string, string>(3);
    cache.set("/1", "old");
    cache.set("/1", "new");
    expect(cache.size).toBe(1);
    expect(cache.get("/1")).toBe("new");
  });
});
