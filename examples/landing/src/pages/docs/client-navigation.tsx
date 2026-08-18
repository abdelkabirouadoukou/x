import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Guides</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">
        Client Navigation &amp; Images
      </h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Every plain <span className="text-foreground">&lt;a&gt;</span> tag on an x site already
        navigates client-side, with no router setup required. This page covers that behavior, the{" "}
        <span className="text-foreground">&lt;Link&gt;</span> convenience component, the built-in
        remote image proxy, and the two error surfaces (dev overlay, 404 page).
      </p>

      <h2 className="text-xl">Client-side navigation, by default</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Every rendered page inlines a small navigation script (
        <span className="text-foreground">CLIENT_NAV_SCRIPT</span>). It intercepts clicks on
        same-origin <span className="text-foreground">&lt;a href&gt;</span> elements, fetches the
        destination page, and swaps the page content in place instead of doing a full browser
        navigation, so you get SPA-style transitions without adding a router or wrapping links in
        anything. It also prefetches on hover/focus and handles back/forward via{" "}
        <span className="text-foreground">popstate</span>.
      </p>
      <CodeBlock
        label="just works"
        code={`// No import needed — this already does client-side nav + hover prefetch:
<a href="/docs/routing">Routing</a>`}
      />
      <p className="mt-4 text-muted-foreground">Opt individual links out with data attributes:</p>
      <CodeBlock
        label="opt out"
        code={`<a href="/legacy" data-no-nav>Full page load</a>
<a href="/heavy-page" data-no-prefetch>No hover prefetch, still client nav</a>`}
      />
      <p className="mt-4 text-muted-foreground">
        Links are skipped automatically if they cross origins, open a new tab (
        <span className="text-foreground">target</span>), carry a{" "}
        <span className="text-foreground">download</span> attribute, or use a{" "}
        <span className="text-foreground">#</span>/<span className="text-foreground">mailto:</span>/
        <span className="text-foreground">tel:</span> scheme. Those always behave like normal
        anchors.
      </p>

      <h2 className="text-xl">The &lt;Link&gt; component</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">&lt;Link&gt;</span> is a typed wrapper around the same
        behavior above. Use it when you want the opt-out props to be type-checked instead of
        stringly-typed data attributes:
      </p>
      <CodeBlock
        label="Link"
        code={`import { Link } from "@thexjs/core";

<Link href="/docs">Docs</Link>

// Same opt-outs, as real props:
<Link href="/legacy" clientNav={false}>Full page load</Link>
<Link href="/heavy-page" prefetch={false}>No prefetch</Link>`}
      />

      <h2 className="text-xl">Remote image proxy</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">createImageProxyHandler</span> mounts a{" "}
        <span className="text-foreground">GET /_x/image</span> route that fetches an allow-listed
        remote image server-side and streams it back from your own origin. The browser never makes a
        cross-origin image request, so a strict{" "}
        <span className="text-foreground">img-src 'self'</span> CSP (see{" "}
        <a href="/docs/security" className="text-primary underline underline-offset-2">
          Security
        </a>
        ) still works even with remote images. This page's own Stardance badge is proxied through it
        right now.
      </p>
      <CodeBlock
        label="createApp.ts / x.config.ts wiring"
        code={`import { createImageProxyHandler } from "@thexjs/core";

const imageProxy = createImageProxyHandler({
  remoteHosts: ["stardance.hackclub.com"], // required allow-list — empty means requests are rejected
});`}
      />
      <CodeBlock
        label="usage"
        code={`<img src={\`/_x/image?url=\${encodeURIComponent("https://stardance.hackclub.com/logo.png")}\`} />`}
      />
      <p className="mt-4 text-muted-foreground">
        It's a proxy, not an optimizer. No resizing or format conversion happens. Only hosts in{" "}
        <span className="text-foreground">remoteHosts</span> are ever fetched (this is what prevents
        the route from becoming an open SSRF relay), only a fixed set of image content types are
        allowed through, and successful responses are served with a one-day, immutable{" "}
        <span className="text-foreground">Cache-Control</span> header.
      </p>

      <h2 className="text-xl">Dev error overlay</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        When a loader, page, or API route throws during{" "}
        <span className="text-foreground">x dev</span>,{" "}
        <span className="text-foreground">renderErrorOverlay</span> renders a full-screen overlay
        with the error message and stack trace, instead of a bare 500 response. It's dev-only:
        production builds never ship the overlay, they return a plain error response.
      </p>

      <h2 className="text-xl">404 handling</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Drop a <span className="text-foreground">src/pages/_404.tsx</span> to customize the
        site-wide not-found page. If you don't provide one, x falls back to{" "}
        <span className="text-foreground">DefaultNotFound</span>, a minimal built-in page, so every
        project has a sane 404 without extra setup.
      </p>
      <CodeBlock
        label="src/pages/_404.tsx"
        code={`export default function NotFound() {
  return <h1>Nothing here.</h1>;
}`}
      />

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/packages/core"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          @thexjs/core <ArrowRight className="h-3.5 w-3.5" />
        </a>
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
