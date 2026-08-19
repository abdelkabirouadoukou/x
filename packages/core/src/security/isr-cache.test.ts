import { describe, expect, test } from "bun:test";
import { IsrCache, isrCacheKey } from "./isr-cache";

describe("isrCacheKey", () => {
  test("keeps pathname and search, ignores host", () => {
    expect(isrCacheKey("http://localhost/blog/one")).toBe("/blog/one");
    expect(isrCacheKey("http://localhost/search?q=alpha&page=2")).toBe("/search?q=alpha&page=2");
  });
});

describe("IsrCache", () => {
  test("getOrCompute computes once across concurrent misses (stampede dedup)", async () => {
    const cache = new IsrCache();
    let computeCount = 0;

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        cache.getOrCompute("/a", async () => {
          computeCount++;
          await Bun.sleep(5);
          return "html-a";
        }),
      ),
    );

    expect(computeCount).toBe(1);
    expect(results.every((r) => r === "html-a")).toBe(true);

    const cached = await cache.getOrCompute("/a", () => Promise.resolve("html-a-2"));
    expect(cached).toBe("html-a");
  });

  test("Response results are passed through and never cached", async () => {
    const cache = new IsrCache();
    const response = new Response("redirect", { status: 302 });

    const first = await cache.getOrCompute("/r", async () => {
      await Bun.sleep(2);
      return response;
    });
    expect(first).toBe(response);
    expect(cache.size).toBe(0);
  });

  test("evicts oldest entries past maxEntries (LRU)", () => {
    const cache = new IsrCache(2);
    cache.set("/1", "one");
    cache.set("/2", "two");
    cache.set("/3", "three");
    expect(cache.size).toBe(2);
    expect(cache.get("/1")).toBeUndefined();

    // Touching /2 makes it most-recently-used, so /3 is evicted next.
    expect(cache.get("/2")?.html).toBe("two");
    cache.set("/4", "four");
    expect(cache.get("/3")).toBeUndefined();
    expect(cache.get("/4")?.html).toBe("four");
  });

  test("deletePath purges every query variant under a pathname", () => {
    const cache = new IsrCache();
    cache.set("/search?q=alpha", "a");
    cache.set("/search?q=beta", "b");
    cache.set("/other", "o");

    expect(cache.deletePath("/search")).toBe(2);
    expect(cache.size).toBe(1);
    expect(cache.get("/other")?.html).toBe("o");
  });

  test("clear empties everything", () => {
    const cache = new IsrCache();
    cache.set("/1", "one");
    cache.set("/2", "two");
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
