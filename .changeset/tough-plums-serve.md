---
"@thexjs/core": patch
---

Emit a per-response CSP nonce instead of `script-src 'unsafe-inline'` (closes #111):

- HTML responses (server-rendered, ISR, 404, content pages) now generate a
  128-bit random nonce per request, stamp it on every framework inline script
  (client navigation, live-reload, island hydration props), and build the
  default Content-Security-Policy with `script-src 'self' 'nonce-<value>'`
  instead of `'unsafe-inline'`.
- The nonce travels on an internal `x-csp-nonce` response header so ISR cache
  hits reuse the exact value baked into the cached HTML; the header is
  stripped before the response reaches the client. Island bundles load by
  same-origin `src`, so `'self'` continues to authorize them.
- Responses with no inline scripts (API JSON, images) keep the legacy default
  CSP — there is nothing inline to defend with a nonce.
- A custom `security.headers.contentSecurityPolicy` is still applied verbatim
  and wins over the nonce.
- Regression tests: nonce present and `'unsafe-inline'` absent from
  `script-src` on a default server-rendered page; the nonce matches the HTML
  tags; ISR miss→hit reuse the same nonce; unit tests for the header builder.