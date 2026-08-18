import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "src/pages",
  layoutsDir: "src/layouts",
  images: {
    // Reserve the allow-list for future remote images; everything on this
    // site is currently same-origin or served through /_x/image.
    remoteHosts: [],
  },
  security: {
    headers: {
      // CSP: same-origin scripts, self-hosted fonts. style-src keeps
      // 'unsafe-inline' for style="" attributes used by island components
      // (inline animation delays, widths, etc.). script-src 'unsafe-inline'
      // covers x's own island-hydration bootstrap; no third-party domains
      // are referenced by any page.
      contentSecurityPolicy:
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "font-src 'self'; " +
        "connect-src 'self';",
    },
    // The landing site ships many subresources per page (islands, fonts,
    // image proxy). 60/min (the default) is easy for one browser to blow
    // through while browsing docs fast, which 429s static assets and makes
    // the site appear broken. Raise it well above any human browsing rate.
    rateLimit: {
      limit: 300,
      windowMs: 60_000,
    },
  },
});
