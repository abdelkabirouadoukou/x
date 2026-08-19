import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { createIslandRegistry, Island, IslandProvider } from "./island";
import { renderPage, renderPageOnce, renderStreamingPage } from "./render";

/**
 * Regression tests for the single-render SSR rework (#87).
 *
 * Before, a page render made two passes: a throwaway "discovery" render to
 * populate the island registry, then the real render for the HTML. A component
 * whose output depends on mutable state (Math.random, an internal counter,
 * clock reads) could register a DIFFERENT island set in pass one than the HTML
 * actually contained in pass two — so the page would ship hydration scripts
 * that don't match its markup, or miss ones that do.
 *
 * `renderPageOnce` collapses this to one pass. These tests prove the island
 * script list and the HTML always come from the SAME single render.
 */

describe("renderPageOnce single-render determinism", () => {
  test("resolves island scripts from the registry of the SAME render that produced the HTML", async () => {
    // Flip flips between islands on every render. A two-pass pipeline would
    // register Island A (discovery), then render Island B into the HTML —
    // scripts and markup disagree. Single-render touches the tree once, so the
    // script list and the markup must both reflect the same pass.
    let renders = 0;
    function Flip() {
      renders += 1;
      const name = renders === 1 ? "IslandA" : "IslandB";
      return createElement(Island, { name }, createElement("span", null, name));
    }

    const registry = createIslandRegistry();
    let resolves = 0;
    const html = await renderPageOnce(
      createElement(IslandProvider, { registry }, createElement(Flip)),
      {
        resolveIslandScripts: () => {
          resolves += 1;
          return Promise.resolve(registry.entries.map((e) => `/islands/${e.name}.js`));
        },
      },
    );

    expect(renders).toBe(1);
    expect(resolves).toBe(1);
    expect(registry.entries).toHaveLength(1);
    expect(registry.entries[0]?.name).toBe("IslandA");

    // The HTML and the script tag both describe IslandA; no trace of IslandB.
    expect(html).toContain('data-island="IslandA"');
    expect(html).toContain('<script data-island-script src="/islands/IslandA.js"></script>');
    expect(html).not.toContain("IslandB");
  });

  test("identical deterministic input produces byte-identical HTML across renders", async () => {
    const make = () =>
      createElement(
        "section",
        null,
        createElement("h2", null, "Deterministic"),
        createElement("p", null, "same every time"),
      );

    const first = await renderPageOnce(make(), { title: "Snapshot" });
    const second = await renderPageOnce(make(), { title: "Snapshot" });
    expect(second).toBe(first);
  });

  test("falls back to a precomputed islandScripts list when resolveIslandScripts is absent", async () => {
    const html = await renderPageOnce(createElement("p", null, "built at deploy"), {
      islandScripts: ["/_islands/route/route.js"],
    });
    expect(html).toContain('<script data-island-script src="/_islands/route/route.js"></script>');
  });
});

describe("renderPage emits discovery-free HTML", () => {
  test("renderPage is still sync and unchanged for build-time static pages", () => {
    const html = renderPage(createElement("p", null, "static"), {
      islandScripts: ["/_islands/route/route.js"],
    });
    expect(html).toContain("<p>static</p>");
    expect(html).toContain('src="/_islands/route/route.js"');
  });
});

describe("renderStreamingPage lazy island footer", () => {
  test("resolves the island script list from the registry after the single render", async () => {
    let renders = 0;
    function Counter() {
      renders += 1;
      return createElement(
        Island,
        { name: "LiveCounter" },
        createElement("button", { type: "button" }, "0"),
      );
    }

    const registry = createIslandRegistry();
    const stream = await renderStreamingPage(
      createElement(IslandProvider, { registry }, createElement(Counter)),
      {
        resolveIslandScripts: () =>
          Promise.resolve(registry.entries.map((e) => `/islands/${e.name}.js`)),
      },
    );

    const reader = stream.getReader();
    let html = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) html += new TextDecoder().decode(value);
    }

    expect(renders).toBe(1);
    // One island registered, resolved after the render, and both the markup
    // and the script tag describe the same island.
    expect(html).toContain('data-island="LiveCounter"');
    expect(html).toContain('<script data-island-script src="/islands/LiveCounter.js"></script>');
    expect(html).toContain('<button type="button">0</button>');
  });
});

describe("CSP nonce on inline scripts", () => {
  test("renderPage stamps the nonce on every inline script it emits", () => {
    const html = renderPage(createElement("div", null, "hello"), {
      title: "Nonce",
      liveReload: true,
      cspNonce: "nonce-xyz",
      islandProps: { counter: '{"count":0}' },
      islandScripts: ["/_islands/counter.js"],
    });
    expect(html).toContain('nonce="nonce-xyz"');
    // Client nav + live-reload are inline scripts: both must carry the nonce.
    expect(html.match(/<script nonce="nonce-xyz">/g)).toHaveLength(2);
    // Island props are a non-executing data block; a nonce-based script-src
    // still requires the element nonce to allow it.
    expect(html).toContain(
      '<script id="__X_ISLAND_PROPS" type="application/json" nonce="nonce-xyz">',
    );
    // External island scripts are same-origin, so 'self' authorises them — no nonce needed.
    expect(html).toContain('<script data-island-script src="/_islands/counter.js"></script>');
  });

  test("renderPageOnce propagates the nonce to the rendered shell", async () => {
    const html = await renderPageOnce(createElement("h2", null, "once"), {
      cspNonce: "nonce-once",
    });
    expect(html).toContain('<script nonce="nonce-once">');
  });

  test("renderStreamingPage stamps the nonce on its inline footer scripts", async () => {
    const stream = await renderStreamingPage(createElement("p", null, "stream"), {
      cspNonce: "nonce-stream",
      islandProps: { counter: '{"count":1}' },
      islandScripts: ["/_islands/counter.js"],
    });
    const reader = stream.getReader();
    let html = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) html += new TextDecoder().decode(value);
    }
    expect(html).toContain('<script nonce="nonce-stream">');
    expect(html).toContain(
      '<script id="__X_ISLAND_PROPS" type="application/json" nonce="nonce-stream">',
    );
    expect(html).toContain('<script data-island-script src="/_islands/counter.js"></script>');
  });

  test("without a nonce, script tags are emitted exactly as before", () => {
    const html = renderPage(createElement("div", null, "x"), { liveReload: true });
    expect(html).not.toContain("nonce=");
    expect(html).toContain("<script>");
  });
});
