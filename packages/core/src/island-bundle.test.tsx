import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { renderToString } from "react-dom/server";
import { unmountIslandRoots } from "./client-nav";
import { createIslandRegistry, Island, IslandProvider } from "./island";
import { generateHydrateEntry } from "./island-bundle";

declare global {
  interface Window {
    __xTestCleanupCount?: number;
  }
}

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/islands");
const ROUTE_PATH = join(FIXTURE_DIR, "route.tsx");

const ROUTE_SOURCE = `import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>Like {count}</button>;
}

export const islands = { Counter };
`;

const CLEANUP_ROUTE_PATH = join(FIXTURE_DIR, "route-cleanup.tsx");

const CLEANUP_ROUTE_SOURCE = `import { useEffect, useState } from "react";

export function CleanupTracker() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => {
      window.__xTestCleanupCount = (window.__xTestCleanupCount || 0) + 1;
    };
  }, []);
  return <div>{mounted ? "alive" : "init"}</div>;
}

export const islands = { CleanupTracker };
`;

// SSR an island exactly as the request pipeline does (IslandProvider + Island),
// so the markup that reaches the browser carries the data-island wrapper.
async function ssrIsland(): Promise<string> {
  const registry = createIslandRegistry();
  const { Counter } = await import(ROUTE_PATH);
  return renderToString(
    <IslandProvider registry={registry}>
      <Island name="Counter">
        <Counter />
      </Island>
    </IslandProvider>,
  );
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

let entryIndex = 0;

// Each test writes a fresh entry file so the dynamic import isn't cached — the
// hydration code must actually run against that test's DOM.
async function hydrate(): Promise<void> {
  const entryPath = join(FIXTURE_DIR, `entry-${entryIndex++}.tsx`);
  writeFileSync(entryPath, generateHydrateEntry(ROUTE_PATH));
  await import(entryPath);
  await tick();
}

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(ROUTE_PATH, ROUTE_SOURCE);
  writeFileSync(CLEANUP_ROUTE_PATH, CLEANUP_ROUTE_SOURCE);
  GlobalRegistrator.register();
});

afterAll(async () => {
  // Let React scheduler drain — unmounting island roots enqueues async work
  // that references window.event; unregistering before it fires causes
  // "ReferenceError: window is not defined" on Bun < 1.4.
  await new Promise((r) => setTimeout(r, 200));
  GlobalRegistrator.unregister();
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("island hydration runtime", () => {
  test("SSR island output survives the hydration round-trip", async () => {
    document.body.innerHTML = await ssrIsland();
    expect(document.querySelector("button")?.textContent).toBe("Like 0");

    await hydrate();

    const island = document.querySelector("[data-island='Counter']");
    expect(island).not.toBeNull();
    const button = island?.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("Like 0");
  });

  test("event handlers wired during hydration actually fire", async () => {
    document.body.innerHTML = await ssrIsland();
    await hydrate();

    const button = document.querySelector("button");
    expect(button?.textContent).toBe("Like 0");
    button?.click();
    await tick();
    expect(document.querySelector("button")?.textContent).toBe("Like 1");
    document.querySelector("button")?.click();
    await tick();
    expect(document.querySelector("button")?.textContent).toBe("Like 2");
  });
});

describe("island root unmount on client-nav (#158)", () => {
  beforeEach(() => {
    window.__xIslandRoots = [];
    window.__xTestCleanupCount = 0;
  });

  test("useEffect cleanup fires when island root is unmounted via __xIslandRoots", async () => {
    const registry = createIslandRegistry();
    const { CleanupTracker } = await import(CLEANUP_ROUTE_PATH);
    document.body.innerHTML = renderToString(
      <IslandProvider registry={registry}>
        <Island name="CleanupTracker">
          <CleanupTracker />
        </Island>
      </IslandProvider>,
    );

    const entryPath = join(FIXTURE_DIR, `entry-cleanup-${entryIndex++}.tsx`);
    writeFileSync(entryPath, generateHydrateEntry(CLEANUP_ROUTE_PATH));
    await import(entryPath);
    await tick();

    expect(document.querySelector("div")?.textContent).toBe("alive");
    expect(window.__xTestCleanupCount).toBe(0);
    expect(window.__xIslandRoots).toBeDefined();
    expect(window.__xIslandRoots?.length).toBe(1);

    unmountIslandRoots();
    await tick();

    expect(window.__xTestCleanupCount).toBe(1);
  });

  test("two sequential hydrate cycles do not leak island roots and cleanup fires per cycle", async () => {
    // Use CleanupTracker so we can verify cleanup fires across both cycles,
    // not just that the registry length resets.
    const registry1 = createIslandRegistry();
    const { CleanupTracker } = await import(CLEANUP_ROUTE_PATH);
    document.body.innerHTML = renderToString(
      <IslandProvider registry={registry1}>
        <Island name="CleanupTracker">
          <CleanupTracker />
        </Island>
      </IslandProvider>,
    );

    const entry1 = join(FIXTURE_DIR, `entry-seq1-${entryIndex++}.tsx`);
    writeFileSync(entry1, generateHydrateEntry(CLEANUP_ROUTE_PATH));
    await import(entry1);
    await tick();

    expect(window.__xIslandRoots).toBeDefined();
    expect(window.__xIslandRoots?.length).toBe(1);
    expect(window.__xTestCleanupCount).toBe(0);

    unmountIslandRoots();
    await tick();
    expect(window.__xTestCleanupCount).toBe(1);

    // Second cycle — fresh SSR + hydrate.
    const registry2 = createIslandRegistry();
    document.body.innerHTML = renderToString(
      <IslandProvider registry={registry2}>
        <Island name="CleanupTracker">
          <CleanupTracker />
        </Island>
      </IslandProvider>,
    );

    const entry2 = join(FIXTURE_DIR, `entry-seq2-${entryIndex++}.tsx`);
    writeFileSync(entry2, generateHydrateEntry(CLEANUP_ROUTE_PATH));
    await import(entry2);
    await tick();

    expect(window.__xIslandRoots?.length).toBe(1);

    unmountIslandRoots();
    await tick();
    expect(window.__xTestCleanupCount).toBe(2);
    expect(window.__xIslandRoots?.length).toBe(0);
  });
});
