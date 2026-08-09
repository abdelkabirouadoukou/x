# Security

x takes the client/server boundary seriously: secrets (`DATABASE_URL`,
`STRIPE_SECRET_KEY`, …) must never reach the browser. This page documents the
security features built into the framework, how to configure them, and how to
report a vulnerability.

Most of this got written the way most security docs do, after something
almost went wrong. The env-leak scanner exists because I nearly shipped a
`STRIPE_SECRET_KEY` in a client bundle during early testing. So take the tone
below seriously even if the repo itself is young.

## Security model

Everything below is **enabled by default** with safe defaults, so a fresh app
is reasonably hardened out of the box:

| Control | Default | Where |
|---|---|---|
| CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy | on | `security.headers` |
| CSRF origin verification on `/__x/actions/*` | on | `security.csrf` |
| Rate limiting (60 req/min/IP) | on | `security.rateLimit` |
| Env-leak scan on every island bundle | on | build step (`assertNoEnvLeakage`) |
| `/healthz` + `/readyz` | on | `observability.health` |

Configuration lives in `x.config.ts` under the `security` and `observability`
keys. See [Config](https://thexjs.vercel.app/docs) for the full option list.

## Security headers

Every response is hardened with a conservative same-origin Content-Security-Policy,
`Strict-Transport-Security` (180-day, includeSubDomains), `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.

The strict CSP defaults to `img-src 'self' data:`. To load remote images under
this policy, use the built-in `/_x/image` proxy (see
[Client navigation & images](https://thexjs.vercel.app/docs/client-navigation))
instead of loosening the CSP.

```ts
export default defineConfig({
  security: {
    headers: {
      contentSecurityPolicy:
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
      hstsMaxAge: 15552000,
    },
  },
});
```

Pass `headers: false` to disable entirely (not recommended in production).

## CSRF protection

Server actions (`/__x/actions/*`) and other mutating endpoints are protected
by two independent checks:

1. **Origin/Referer verification (always on)**: cross-site `POST` requests
   whose `Origin` (or `Referer`) doesn't match the app's own origin are
   rejected. This alone stops the vast majority of CSRF attempts with zero setup.
2. **Double-submit token (opt-in)**: a random `x_csrf_token` cookie is issued
   and must be echoed back in the `x-csrf-token` header. Enable with
   `security.csrf.requireToken: true`. The cookie carries `HttpOnly`-independent
   `SameSite=Lax` and gets `Secure` in production.

I kept the token check opt-in on purpose. The origin check covers real-world
CSRF for almost every app, and I didn't want every fresh `create-thexjs-app`
project to inherit cookie plumbing it probably doesn't need on day one.
Turn it on if you're doing something the origin check genuinely can't cover
(embedded widgets, cross-subdomain forms, that kind of thing).

```ts
export default defineConfig({
  security: {
    csrf: {
      requireToken: true,
      // Origins that are legitimately allowed to POST (e.g. a second subdomain).
      allowedOrigins: ["https://app.example.com"],
    },
  },
});
```

## Rate limiting

A fixed-window counter keyed by client IP (from `x-forwarded-for`, falling
back to `x-real-ip`), defaulting to 60 requests per minute. Responses over the
limit return `429` with `Retry-After` and `X-RateLimit-*` headers.

```ts
export default defineConfig({
  security: {
    rateLimit: { limit: 120, windowMs: 60_000 },
  },
});
```

Pass `rateLimit: false` to disable (e.g. behind a CDN that already rate limits).

### Multi-instance deployments

The in-memory store is per-process. For K8s / multiple replicas, provide a
shared Redis-backed store so limits are enforced cluster-wide:

```ts
import { createRedisRateLimitStore } from "@thexjs/core";

export default defineConfig({
  security: {
    rateLimit: {
      store: createRedisRateLimitStore({ url: process.env.REDIS_URL }),
    },
  },
});
```

The Redis store uses Bun's built-in `bun:redis` (no npm dependency) and
connects lazily on first use. Expired buckets are swept automatically.

## Environment variable isolation

**Only variables prefixed `THEXJS_PUBLIC_` may appear in client-shipped code.**
Anything else referenced from a client bundle fails the build with an
`EnvLeakageError`, enforced two ways:

1. **Build-time interception**: client imports of `src/actions/*` server
   functions are rewritten to `fetch()` wrappers before the client bundler
   ever reads the real source, so secrets in action bodies are structurally
   excluded.
2. **A post-bundle scan**: `assertNoEnvLeakage` scans the compiled JS for
   `process.env.*`, `Bun.env.*`, `import.meta.env.*`, including bracket access,
   dynamic keys, string-concatenated keys, and aliased `process.env` objects.

The scan is a safety net over the interception, not a replacement for it.
Defense in depth: keep secrets out of client components entirely, and set
`THEXJS_PUBLIC_` variables with `THEXJS_PUBLIC_` in the name in your deploy
platform's environment.

This scanner took three rewrites to get right. The first version only
matched `process.env.X` and missed bracket access entirely, so `Bun.env["API_KEY"]`
sailed straight through. It still isn't un-fool-able (see the note above about
`Bun["e" + "nv"]`), which is exactly why it's a safety net and not the whole
plan.

```env
# Public (safe to reference in client code)
THEXJS_PUBLIC_API_URL=https://api.example.com

# Server-only (must only be read in loaders, actions, API routes)
DATABASE_URL=postgres://...
STRIPE_SECRET_KEY=sk_live_...
```

## Authentication & sessions

`@thexjs/auth` is the framework's opt-in auth package: credentials
(username/password) and OAuth2 (including a GitHub preset) providers, session
stores on the data layer (SQLite/Postgres), and a catch-all API handler. Its
security properties:

- **Passwords** — hashed with Argon2id via `Bun.password` (`hashPassword` /
  `verifyPassword`). Never store plaintext.
- **Session tokens** — opaque random 128-bit strings. Only an HMAC-SHA256
  digest of the token (keyed by `AUTH_SECRET`) is stored, so a database leak
  does not expose usable session cookies. Sessions expire after
  `sessionMaxAge` (default 7 days) and are individually revocable.
- **OAuth state** — a `x_oauth_state` cookie challenge (HMAC'd, 5-minute
  expiry) must match the `state` param on the callback, preventing
  login-CSRF / session-fixation via crafted callbacks.
- **CSRF** — auth `POST` endpoints (`signin`, `signout`) run the core
  `checkCsrf` (Origin/Referer verification; see above) and return `403` on
  failure. To add the double-submit token to auth endpoints, set
  `security.csrf.requireToken: true` — auth routes honor it automatically.
- **Cookies** — `HttpOnly; SameSite=Lax`, plus `Secure` when
  `NODE_ENV=production`. Set a **stable** `secret` in production; an omitted
  secret generates a per-process value that doesn't survive restarts.

The framework itself still ships the primitives you'd build auth on
(cookies, middleware, server functions, data layer), and the `basic` and
`saas` templates include a **demo** auth (hardcoded `admin` / `admin`, no
password hashing, no expiry) that is explicitly marked DEMO ONLY — replace it
with `@thexjs/auth` (or your own) before shipping.

## Health endpoints

- `/healthz` (liveness): returns `200 {"status":"ok"}` while the process serves.
- `/readyz` (readiness): runs every configured check and returns `200` when
  all pass, `503` otherwise.

```ts
export default defineConfig({
  observability: {
    health: {
      checks: {
        database: () => db.select`SELECT 1`().then(() => true).catch(() => false),
      },
    },
  },
});
```

Wire these into your orchestrator (K8s `livenessProbe` / `readinessProbe`,
Fly checks, Railway healthchecks).

## Operational notes

- Run behind HTTPS (a reverse proxy or the platform's edge). HSTS assumes it.
- Set `NODE_ENV=production` for `Secure` cookies and production React builds.
- The process handles `SIGTERM`/`SIGINT` gracefully: it stops accepting new
  connections, flushes the configured error reporter, and exits.
- Logging is structured JSON via `observability.logging`; disable it if you log
  at a reverse proxy instead.

## Vulnerability disclosure & response

### Reporting

Please **do not** open a public issue for security problems. Email the
maintainer at the address in the repository profile, or open a GitHub
Security Advisory via the repo's **Security** tab (private). Include:

- A description of the issue and its impact.
- Steps to reproduce (minimal code/config).
- Whether it affects a published package version.

If you prefer, you can responsibly disclose through GitHub's coordinated
disclosure flow.

### Response-time SLA

| Milestone | Target |
|---|---|
| Acknowledge receipt | within **48 hours** |
| Initial triage (severity assessment + confirmation) | within **5 business days** |
| Fix available for Critical/High (with a workaround if a full fix takes longer) | within **30 days** of confirmation |
| Fix available for Medium/Low | at the next scheduled release, or **60 days** for Low |

If a milestone cannot be met we'll say so and give a revised date — we'd rather
under-promise than go silent.

### Severity classification

Severity is assigned from CVSS v3.1 base scores, with the qualitative mapping
below. Context that matters for this framework: the attack surface is the
client/server boundary (browser-visible code, `/__x/actions/*`, image proxy,
auth/session handling), so issues are rated by what a remote or cross-site
attacker can actually do, not by source-level severity alone.

| Severity | CVSS | Examples in this codebase |
|---|---|---|
| **Critical** | 9.0–10.0 | Remote code execution; auth bypass that grants access without credentials; secret disclosure in client bundles |
| **High** | 7.0–8.9 | Server-side request forgery via the image proxy; cross-site request forgery on auth endpoints; session token forgery/leak |
| **Medium** | 4.0–6.9 | Reflected/stored XSS with mitigations; information disclosure of non-secret data; rate-limit bypass |
| **Low** | 0.1–3.9 | Logging of sensitive fields; minor header misconfigurations; DoS under unusual load |

### Coordinated disclosure

We ask reporters to keep issues private until we've shipped a fix:

- **90 days** of coordinated disclosure before public disclosure, **negotiable
  to shorter** for issues under active exploitation (we'll coordinate a
  disclosure date with you).
- After a fix is released, a public advisory (via GitHub Security Advisories)
  is published with credit to the reporter, consistent with their preference.
- We will not publicly blame reporters or maintainers; the goal is safe fixes.

### Patch & backport policy

The framework follows the versioning policy in `VERSIONING.md` — `@thexjs/*`
packages ship in lockstep on one versioning PR per cycle. Security fixes are
subject to the same backport rule:

- **Latest major**: all security fixes ship in the next patch/minor release.
- **Previous major**: critical/high fixes are backported as patch releases for
  **12 months** after the newer major ships, or until the older major is
  retired, whichever is sooner. Medium/low fixes are backported on a
  best-effort basis.
- **Older majors**: no security patches. Users on old majors must upgrade.
  Backport releases use the same lockstep versioning PR flow.
- Deprecation of a major is announced at least one major in advance (see the
  deprecation window in `VERSIONING.md`).

If you're on an unsupported version and believe you're affected, report it
anyway — we'll help you find a path (usually: upgrade, or a config workaround).
