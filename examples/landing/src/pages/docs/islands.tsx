import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Islands</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Islands architecture</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The server renders your full page as HTML, then only the pieces you mark as islands hydrate
        in the browser. Everything else ships zero JavaScript.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Why islands</h2>
      <p className="mt-3 text-muted-foreground">
        A page full of interactive widgets doesn't need to ship one giant bundle. Each island is a
        small, self-contained hydration entry: it imports only what it needs, hydrates in place, and
        nothing on the page outside an island is ever re-rendered on the client. That keeps first
        paint fast and the JS budget predictable.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Creating an island</h2>
      <p className="mt-3 text-muted-foreground">
        Wrap a component in <span className="text-foreground">&lt;Island&gt;</span> and register it
        on the same page or layout with{" "}
        <span className="text-foreground">export const islands</span>. Only registered islands get a
        hydration bundle, so an unregistered component never ships client JS even if you wrap it.
      </p>
      <CodeBlock
        label="src/components/like-button.tsx"
        code={`import { useState } from "react";

export default function LikeButton() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)} className="rounded-full border px-4 py-2">
      Like {count}
    </button>
  );
}`}
      />
      <CodeBlock
        label="src/pages/blog/[slug].tsx"
        code={`import { Island } from "@thexjs/core";
import { LikeButton } from "../../components/like-button";

export const islands = { LikeButton };

export default function BlogPost({ post }) {
  return (
    <article>
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <div>{post.body}</div>
      <Island name="LikeButton" client="visible">
        <LikeButton />
      </Island>
    </article>
  );
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Hydration triggers</h2>
      <p className="mt-3 text-muted-foreground">
        The <span className="text-foreground">client</span> prop picks when the island hydrates:
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">client="visible"</span> — hydrate when the island
          scrolls into view. Good for content below the fold.
        </li>
        <li>
          <span className="text-foreground">client="idle"</span> — hydrate when the browser goes
          idle. Good for widgets the user isn't waiting on.
        </li>
        <li>
          <span className="text-foreground">client="load"</span> — hydrate immediately on page load.
          Use for the first thing the user interacts with.
        </li>
      </ul>

      <h2 className="mt-12 text-xl font-bold tracking-tight">How hydration works</h2>
      <p className="mt-3 text-muted-foreground">
        At build time x bundles each island separately, server-renders the page to static HTML with
        the island's markup inline, and drops in a small loader script. In the browser the loader
        fetches the island's chunk on demand and hydrates only that subtree. Islands can be nested
        and reused across routes; each registered component gets exactly one entry per route.
      </p>

      <div className="mt-16 border-t border-border pt-8">
        <a
          href="/docs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to docs
        </a>
      </div>
    </div>
  );
}
