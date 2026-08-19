---
"@thexjs/core": patch
---

Deterministic SSR and observable hydration:

- Pages now render exactly once. The two-pass "discovery" render (one throwaway
  pass to find islands, then the real pass for the HTML) is gone: `renderPageOnce`
  renders the tree a single time and resolves the island script list from the
  registry that same pass produced. Non-deterministic components (Math.random in
  `useState`, clock reads) can no longer diverge between passes, so markup and
  hydration scripts always describe the same render. Applies to server-mode
  streaming (via a lazy footer) and ISR/static computation; build-time static
  generation precomputes its script lists and is unaffected.
- Hydration mismatches are no longer silently swallowed. Islands report a
  mismatch through `onRecoverableError` to a new `POST /__x/hydration-mismatch`
  endpoint (same-origin only, 1KB body cap), which forwards it to the error
  reporter as `phase: "ssr"`, `tag: "hydration-mismatch"` and increments an
  `x_http_hydration_mismatch` counter labeled by island, so rendering bugs stay
  observable in production.