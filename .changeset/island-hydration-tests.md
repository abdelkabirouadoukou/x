---
"@thexjs/core": patch
---

Adds automated coverage for the Islands runtime: `island-bundle.test.tsx`
hydrates a real island client bundle in a happy-dom DOM and asserts the SSR
output survives hydration and that event handlers wired during hydration fire.
