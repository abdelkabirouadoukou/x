---
"@thexjs/core": minor
---

feat(image): ship a next/image-equivalent `<Image>` component and accept width/quality hints in the image proxy

- New `Image` component (`packages/core/src/image.tsx`, exported from `@thexjs/core`):
  responsive `srcset`/`sizes` through the allow-listed `/_x/image` proxy,
  `priority` (skips lazy, sets fetchpriority=high), `fill` mode,
  `placeholder="blur"` via `blurDataURL`, required `alt`, automatic remote-src
  rewriting, and dev-only warnings.
- `createImageProxyHandler` now validates-and-ignores optional `w` (width) and
  `q` (quality) query params so the component API is stable ahead of the
  resize/transcode pipeline. SSRF allow-list and redirect protections are
  unchanged.
- `examples/basic` swaps its local `<Image>` wrapper for a thin re-export of
  the framework component and documents `images.remoteHosts` in `x.config.ts`.