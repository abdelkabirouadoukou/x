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
      // only, no inline scripts. Two things on this site need exceptions:
      //  1. Google Fonts loads its stylesheet + woff2 files from a different
      //     origin (fonts.googleapis.com / fonts.gstatic.com).
      //  2. x's own island-hydration bootstrap appears to inline a small
      //     <script> to pass server props to the client before hydrating —
      //     the default policy blocks inline scripts outright, which is the
      //     likely reason islands (Route Resolver, Route Rush, Ship It)
      //     aren't hydrating. 'unsafe-inline' on script-src unblocks that.
      // No img-src exception needed anymore — the Stardance badge now loads
      // through /_x/image, which is same-origin.
      contentSecurityPolicy:
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self';",
    },
  },
});
