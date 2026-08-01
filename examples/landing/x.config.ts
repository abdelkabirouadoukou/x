import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "src/pages",
  layoutsDir: "src/layouts",
  // Allow-list for /_x/image?url=... — the Stardance badge is fetched
  // server-side and re-served from this origin, so the browser never makes
  // a cross-origin request for it (see security.headers below).
  images: {
    remoteHosts: ["stardance.hackclub.com"],
  },
  security: {
    headers: {
      // Default CSP is "default-src 'self'; script-src 'self'" — same-origin
      // only, no inline scripts. Fonts are self-hosted (woff2 under /files,
      // served from public/), so style-src/font-src need no third-party
      // exception. One thing on this site needs an exception:
      //   x's own island-hydration bootstrap appears to inline a small
      //   <script> to pass server props to the client before hydrating —
      //   the default policy blocks inline scripts outright, which is the
      //   likely reason islands (Route Resolver, Route Rush, Ship It)
      //   aren't hydrating. 'unsafe-inline' on script-src unblocks that.
      // No img-src exception needed — the Stardance badge loads through
      // /_x/image, which is same-origin.
      contentSecurityPolicy:
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "font-src 'self'; " +
        "connect-src 'self';",
    },
  },
});
