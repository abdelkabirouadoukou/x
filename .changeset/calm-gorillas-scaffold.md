---
"create-thexjs-app": patch
---

Fix bugs that shipped in freshly scaffolded apps:

- Add `@types/bun` to the base template devDependencies — the generated
  `tsconfig.json` sets `"types": ["bun"]`, but without the types package every
  scaffolded app failed typecheck with TS2688.
- The Tailwind addon's `globals.css` defined theme colors as bare channel
  triples (`--color-background: var(--background)` where the value is
  `255 255 255`), so Tailwind utilities produced invalid color values. They
  now wrap in `rgb(...)`.
- Add a `src/pages/about.tsx` to the base template so the "Next steps" link
  on the home page isn't a 404.
- Bump the stale `FALLBACK_CORE_VERSION` (used when the registry query fails)
  from `0.1.0` to the current `1.2.2`.