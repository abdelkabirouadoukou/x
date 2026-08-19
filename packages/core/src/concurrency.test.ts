import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createApp } from "./createApp";
import { createIslandRegistry, Island, IslandProvider } from "./island";

/**
 * Concurrency regression tests (#96): N parallel requests with distinct
 * identities must never see each other's data. This is the failure class that
 * only appears under load in a single-process server — a shared module global,
 * a cache keyed too loosely, or a registry mutated mid-request — and is
 * invisible in dev (one user) and in sequential tests.
 */

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/concurrency");
const PAGES_DIR = join(FIXTURE_DIR, "pages");
const API_DIR = join(FIXTURE_DIR, "api");

function touch(relPath: string, content: string) {
  const full = join(FIXTURE_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

beforeAll(() => {
  touch(
    "pages/[id].tsx",
    `export const mode = "server";
export async function loader({ params }: { params: Record<string, string> }) {
  return { id: params.id };
}
export default function Page({ loaderData }: { loaderData: { id: string } }) {
  return <h1>id:{loaderData.id}</h1>;
}
`,
  );
  touch(
    "api/echo.ts",
    `export function GET(req: Request) {
  const who = req.headers.get("x-who") ?? "anon";
  return Response.json({ who });
}
`,
  );
  touch(
    "pages/islands.tsx",
    `export const mode = "server";
export default function Islands() {
  return <div>islands</div>;
}
`,
  );
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("cross-request state isolation", () => {
  test("parallel dynamic-route requests each get their own loader data", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });

    const ids = Array.from({ length: 20 }, (_, i) => `user-${i}`);
    const responses = await Promise.all(
      ids.map((id) => a.fetch(new Request(`http://localhost/${id}`))),
    );

    for (const res of responses) {
      expect(res.status).toBe(200);
    }
    const bodies = await Promise.all(responses.map((r) => r.text()));
    for (let i = 0; i < ids.length; i++) {
      expect(bodies[i]).toMatch(new RegExp(`<h1>id:.*${ids[i]}</h1>`));
    }
  });

  test("parallel API requests do not leak headers across identities", async () => {
    const a = await createApp({
      pagesDir: PAGES_DIR,
      apiDir: API_DIR,
      development: false,
      security: { headers: false },
      observability: { logging: false },
    });

    const who = Array.from({ length: 20 }, (_, i) => `client-${i}`);
    const responses = await Promise.all(
      who.map((w) =>
        a.fetch(new Request(`http://localhost/api/echo`, { headers: { "x-who": w } })),
      ),
    );

    const jsons = (await Promise.all(responses.map((r) => r.json()))) as { who: string }[];
    for (let i = 0; i < who.length; i++) {
      expect(jsons[i]?.who).toBe(who[i]);
    }
  });

  test("island ids stay isolated per registry instead of growing globally", async () => {
    // Each createIslandRegistry is a request's own registry. Two registries
    // used back-to-back must both start their id sequence at 0 — a shared
    // module-level counter would let ids creep upward forever.
    const renderWithRegistry = () => {
      const registry = createIslandRegistry();
      return {
        html: renderToString(
          createElement(
            IslandProvider,
            { registry },
            createElement(Island, { name: "one" }, createElement("button", null, "one")),
          ),
        ),
        registry,
      };
    };

    const first = renderWithRegistry();
    expect(first.html).toContain('data-island-id="x-island-0"');

    const rest = await Promise.all(Array.from({ length: 10 }, () => renderWithRegistry()));
    for (const { html } of rest) {
      expect(html).toContain('data-island-id="x-island-0"');
    }
  });
});
