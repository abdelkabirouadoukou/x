---
"@thexjs/create-thexjs-app": minor
---

Add a `--hooks` option that scaffolds `@thexjs/hooks` as a dependency in new
x apps, next to the existing `--auth` and `--content` addons. No template files
are required: the addon is a dependency-only opt-in (the hooks package ships no
CLI-side assets).