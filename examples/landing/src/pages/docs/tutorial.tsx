import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock, TerminalBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Tutorial</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Hello World</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Build a page, add an interactive counter island, run the dev server, and ship a production
        build. This tutorial takes about five minutes and requires only Bun.
      </p>

      <h2 className="text-xl">1. Scaffold the project</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Create a new X project with the scaffolder. Accept the defaults at the feature prompt (press
        enter with nothing selected) for a blank project:
      </p>
      <TerminalBlock
        label="terminal"
        code={`$ bun create thexjs-app@latest hello-world
  ? Select features (space to toggle, enter to confirm) › done
  ✓ created hello-world/
  ✓ installed dependencies
  $ cd hello-world
  $ x dev
  [x] dev server running at http://localhost:3000`}
      />
      <p className="mt-4 text-muted-foreground">
        Open <span className="text-foreground">http://localhost:3000</span> in your browser. You
        should see a blank page with "Hello x!" — that is the default home page from{" "}
        <span className="text-foreground">src/pages/index.tsx</span>.
      </p>

      <h2 className="text-xl">2. Edit the home page</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Open <span className="text-foreground">src/pages/index.tsx</span> and replace its content
        with a page that has a title and a placeholder for an interactive counter:
      </p>
      <CodeBlock
        label="src/pages/index.tsx"
        code={`import { Island } from "@thexjs/core";
import { Counter } from "../components/counter";

export const islands = { Counter };

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl py-20 text-center">
      <h1 className="text-4xl font-bold">Hello from x!</h1>
      <p className="mt-3 text-muted-foreground">
        This page is fully server-rendered. The counter below is an island:
        it hydrates in the browser while everything else ships zero JS.
      </p>
      <Island name="Counter" client="load">
        <Counter />
      </Island>
    </div>
  );
}`}
      />
      <p className="mt-4 text-muted-foreground">
        The page imports <span className="text-foreground">Island</span> from{" "}
        <span className="text-foreground">@thexjs/core</span>, registers{" "}
        <span className="text-foreground">Counter</span> via{" "}
        <span className="text-foreground">export const islands</span>, and renders it inside an{" "}
        <span className="text-foreground">&lt;Island&gt;</span> wrapper with{" "}
        <span className="text-foreground">client="load"</span> (hydrate immediately on page load).
        The dev server hot-reloads the page as soon as you save the file.
      </p>

      <h2 className="text-xl">3. Create the island component</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Create <span className="text-foreground">src/components/counter.tsx</span> with a simple
        interactive counter that uses <span className="text-foreground">useState</span>:
      </p>
      <CodeBlock
        label="src/components/counter.tsx"
        code={`import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="mt-8">
      <p className="text-lg">Count: {count}</p>
      <div className="mt-4 flex justify-center gap-3">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          -1
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          +1
        </button>
      </div>
    </div>
  );
}`}
      />
      <p className="mt-4 text-muted-foreground">
        Because <span className="text-foreground">&lt;Counter&gt;</span> is registered as an island
        on the page, only this component's JavaScript ships to the browser. The heading, paragraph,
        and wrapper div are just static HTML.
      </p>

      <h2 className="text-xl">4. See it hydrate</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Save both files. The dev server picks up the changes and reloads the page automatically.
        Open your browser's developer tools and check the Network tab — you should see a small
        JavaScript chunk load for the island:
      </p>
      <TerminalBlock
        label="terminal · x dev output"
        code={`$ x dev
  [x] resolving routes...
  [x]  ── / (index.tsx)
  [x] compiling island bundles...
  [x]  ── Counter  (client=load)
  [x] dev server running at http://localhost:3000`}
      />
      <p className="mt-4 text-muted-foreground">
        Click the +1 and -1 buttons — they work without a full page reload because the island
        hydrated its React state in-place. The rest of the page (the heading, the paragraph) was
        never re-rendered or hydrated.
      </p>

      <h2 className="text-xl">5. Production build</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Stop the dev server (Ctrl+C) and run a production build:
      </p>
      <TerminalBlock
        label="terminal · x build"
        code={`$ x build
  [x] resolving routes...
  [x] building static pages...
  [x]   ✓ / (index.tsx)
  [x] building island bundles...
  [x]   ✓ /  Counter
  [x] building server bundle...
  [x] build complete in 0.9s -> .x`}
      />
      <p className="mt-4 text-muted-foreground">
        The <span className="text-foreground">.x/</span> directory now contains:
      </p>
      <ul className="mt-3 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">.x/client/index.html</span> — the prerendered HTML with
          the counter's server-rendered markup embedded
        </li>
        <li>
          <span className="text-foreground">.x/client/_islands/</span> — the Counter hydration chunk
          (a few hundred bytes)
        </li>
      </ul>
      <p className="mt-4 text-muted-foreground">
        Because the page has no <span className="text-foreground">mode</span> export, it defaults to
        server mode. If you export <span className="text-foreground">mode = "static"</span>, the
        page prerenders at build time and can deploy to any static host — the island still hydrates
        the same way.
      </p>

      <div className="mt-16 border-t border-border pt-8">
        <a
          href="/docs/islands"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Islands architecture <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
