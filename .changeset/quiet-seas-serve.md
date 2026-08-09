---
"@thexjs/core": patch
---

Make env-leak detection fail production builds loudly instead of silently
degrading. A leaked server-only variable was previously caught by
`assertNoEnvLeakage`, but the build continued and emitted a non-interactive
fallback island while logging only a routine warning — a dead island in
production that looked like a recovered build error. Now `x build` aborts
with an `EnvLeakageError` (non-zero exit, visible to CI/CD), while the dev
server keeps serving but logs a visually distinct `SECURITY` warning instead
of a generic build error so it can't be mistaken for a hot-reload hiccup.