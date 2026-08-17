---
"@thexjs/adapter-vercel": patch
"@thexjs/auth": patch
---

fix(publish): stop the `workspace:*` protocol from leaking into published tarballs

`@thexjs/adapter-vercel@1.0.6` and `@thexjs/auth@3.0.5` were published with
`"@thexjs/core": "workspace:*"` in their manifests. Bun publishes the
`workspace:` range literally (it does not rewrite it like pnpm does), so
consumers installing either package hit:

    Workspace dependency "@thexjs/core" not found

Now the internal dependency is a real semver range (`^1.3.0`, matching how
`@thexjs/cli` already declares it), so both packages install cleanly from
npm. A repo-wide guard test (`scripts/workspace-protocol.test.ts`) plus a
pre-publish check in the release workflow fail the build if a publishable
manifest ever declares `workspace:` again.
