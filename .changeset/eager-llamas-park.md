---
"create-thexjs-app": patch
---

`create-thexjs-app` now falls back to its OWN pinned fallback version for
`@thexjs/cli` (`FALLBACK_CLI_VERSION`) when the npm registry lookup fails,
instead of reusing the core fallback — an offline scaffold was pinning
`@thexjs/cli` to whatever the core fallback happened to be.

Pure helpers were extracted into a side-effect-free `src/package-json.ts`
(`buildPackageJson`, `resolveVersions`, and the `FALLBACK_*` constants) so the
scaffolding logic is unit-testable without triggering the CLI entrypoint.
Adds the package's first test file (`package-json.test.ts`, 7 tests).