---
"create-thexjs-app": patch
---

Fix `--shadcn` scaffolding silently dropping the shadcn feature when the tailwind auto-enable ran; missing feature requirements are now auto-enabled generically from the `requires` metadata and the selected features are always kept.
