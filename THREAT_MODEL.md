# Threat model

A STRIDE-style walk of the `@thexjs/*` request lifecycle. This is a living
document: it states the framework's security properties **as they exist today**
and the residual risk where they are incomplete. It does not overclaim — where
a control is missing or a guarantee is partial, that is said explicitly.

Reading this document assumes the [security model in `SECURITY.md`](SECURITY.md)
(headers, CSRF, rate limiting, env isolation, health endpoints) is enabled,
which it is by default.

## Scope and trust boundary

The framework is a **Bun single-process server** that serves HTML, static
assets, API routes, server functions, and a remote-image proxy. The trust
boundary is the network edge:

- **Untrusted**: any remote client (browser or otherwise) and any remote host
  a user asks the image proxy to fetch.
- **Trusted**: your config (`x.config.ts`), your route/action/loader code, your
  database and secrets, and the Bun runtime + dependency graph (its own trust
  boundary, addressed by the SBOM + CVE gate — see [Supply chain](#supply-chain)).

| Element | In scope |
|---|---|
| Static asset serving (`/public`, `/assets`) | yes |
| API routes (`/api/*`) | yes |
| Server functions (`/__x/actions/*`) | yes |
| Auth + sessions (`@thexjs/auth`) | yes |
| Image proxy (`/_x/image/*`) | yes |
| Data layer / migrations | yes (see [Multi-tenant](#multi-tenant-isolation)) |
| CLI / build tooling | partial (developer trust boundary) |

## STRIDE walk

The sections below walk each surface. STRIDE = Spoofing, Tampering,
Repudiation, Information disclosure, Denial of service, Elevation of privilege.

### 1. Static asset serving

Static assets are read from `publicDir` (or the build's `dist`) and served
with content-type sniffing blocked (`X-Content-Type-Options: nosniff`).

| STRIDE | Assessment |
|---|---|
| **S**poofing | Low. Path traversal is blocked by resolving the requested path inside the public dir and rejecting `..` escapes; assets have no authentication semantics of their own. |
| **T**ampering | Low–medium. Assets are served as shipped; a compromised build pipeline (or a CDN in front) could serve modified content. There is no integrity manifest (SRI) for static assets. |
| **R**epudiation | Low. Asset serving is not an accountability surface. |
| **I**nformation disclosure | Medium. Anything placed in `public/` is public by construction — that is the feature, not a bug. Env-leak scanning (`assertNoEnvLeakage`) runs on **bundles**, not on files dropped in `public/`. A `.env` accidentally copied into `public/` would be served. Documented in `SECURITY.md`. |
| **D**enial of service | Medium. A big tree or large files are read synchronously per request; no per-file rate limit. Behind the global rate limiter. |
| **E**levation of privilege | Low. No code executes on this path. |

Residual risk: no SRI/manifest integrity for static assets, and a `public/`
copy of a secret is served silently. Mitigations: keep secrets out of
`public/` (they belong in env vars — `THEXJS_PUBLIC_*` for browser code), add
SRI if a tampered-asset scenario is in your threat envelope.

### 2. API routes (`/api/*`)

API routes run **your** code in the server process. The framework provides the
request/response plumbing, security headers, rate limiting, and (for
mutations) CSRF.

| STRIDE | Assessment |
|---|---|
| **S**poofing | Medium. No built-in API authentication — you authenticate. `@thexjs/auth` provides sessions; without it, any route is anonymous by design. |
| **T**ampering | Low–medium. Requests are not signed. CSRF protects browser-driven mutations via origin verification (see `SECURITY.md`). |
| **R**epudiation | Medium. Request logs (`observability.logging`) capture method, path, status, and duration but **not** request bodies; no per-user audit trail unless you add one. See [Audit logging](#audit-logging). |
| **I**nformation disclosure | Medium. An uncaught error in an API route returns a clean `500` (global error boundary) and is reported to the error reporter — the stack does not leak to the client. Response bodies are whatever your handler returns. |
| **D**enial of service | Medium. Global rate limiter (60/min/IP default); no per-route limits, no body-size cap, no timeouts on your handler. See [SLOs & DoS](#slos--dos). |
| **E**levation of privilege | **High — see the crash-blast-radius note.** An exception is contained per-request (500 + error reporter), so a throwing handler does **not** crash the process. But API routes share the process with everything else: a handler that blocks the event loop (sync CPU loop, unawaited long operation) degrades or stalls **all** routes. See [Process isolation](#process-isolation). |

### 3. Server functions (`/__x/actions/*`)

Server functions are the RPC layer: client code calls an exported server
function and it executes in the server process. This is the highest-value
attack surface because it is reachable from shipped browser bundles.

| STRIDE | Assessment |
|---|---|
| **S**poofing | Medium. Functions are name-addressable and any anonymous client can invoke them; there is no built-in function-level authorization. Rate limiting + CSRF apply, but a caller does not need to be "logged in" by default. |
| **T**ampering | Low–medium. CSRF origin verification is enforced (same-origin `Origin`/`Referer`), with an optional double-submit token (`security.csrf.requireToken`). Arguments are JSON-parsed; the framework does not validate argument shapes for you. |
| **R**epudiation | Medium. No audit log of which function ran with what arguments, unless you add one. |
| **I**nformation disclosure | Low–medium. Env-leak interception rewrites client imports so secrets in action bodies are structurally excluded from bundles, and `assertNoEnvLeakage` re-scans the compiled JS. Return values are shipped to the browser — only return what is public. |
| **D**enial of service | Medium. Global rate limiter applies; no per-function limits, no timeout on function execution. A slow/busy function blocks the shared process. |
| **E**levation of privilege | Medium–high. A function that validates a secret/enrollment and returns `true` is doing your authz — mistakes here are elevation. The framework does not sandbox function execution. |

### 4. Auth and sessions (`@thexjs/auth`)

| STRIDE | Assessment |
|---|---|
| **S**poofing | Low. Passwords are Argon2id-hashed (`Bun.password`); session tokens are opaque 128-bit random values of which only an HMAC digest is stored. OAuth state is HMAC'd with a 5-minute expiry and checked on callback (login-CSRF / session fixation). |
| **T**ampering | Low. Session cookies are `HttpOnly; SameSite=Lax` (+ `Secure` in production). CSRF covers auth POSTs (`signin`, `signout`). |
| **R**epudiation | Medium. Session lifecycle (create/revoke) is logged at the storage layer; there is no tamper-evident audit log (see [Audit logging](#audit-logging)). |
| **I**nformation disclosure | Low–medium. Only the HMAC digest of the token is stored, so a DB leak does not expose usable cookies. Password hashes (Argon2id) are stored; a DB leak still exposes hashes to offline cracking — require strong passwords. |
| **D**enial of service | Medium. Login endpoints are subject to the global rate limiter (brute force throttled); no account lockout or per-account throttling beyond that. |
| **E**levation of privilege | Low–medium. Session fixation is countered by OAuth state; `@thexjs/auth` is opt-in — the demo auth in the `basic`/`saas` templates is **hardcoded `admin`/`admin` and DEMO ONLY** (see `SECURITY.md`). Shipping the demo auth is a real elevation risk. |

### 5. Image proxy (`/_x/image/*`)

Remote images are fetched server-side so the browser never talks to a third
party directly (CSP `img-src 'self'`). SSRF defense is the core property here.

| STRIDE | Assessment |
|---|---|
| **S**poofing | Low. The proxy is server-to-server; no user identity involved. |
| **T**ampering | Low–medium. Only allow-listed hosts (`options.remoteHosts`) are fetchable; redirects are followed by hand and **re-checked against the allow-list at every hop** (`packages/core/src/images/proxy.ts`), so an allow-listed origin can't bounce to a metadata/internal endpoint. |
| **R**epudiation | Low. |
| **I**nformation disclosure | Medium. The proxy resolves and fetches arbitrary paths on allow-listed hosts — if you allow-list a host that serves private data, the proxy can be used as a read oracle. Allow-list only public image hosts. Content types are constrained to an allow-list (e.g. no HTML). |
| **D**enial of service | Medium. A fetch to a slow/hanging remote host blocks the request (timeout exists; ensure it is configured tightly). Responses are capped by content-type but not by size by default. |
| **E**levation of privilege | Low. No code executes; SSRF to internal metadata endpoints is the primary vector, mitigated by the hop-by-hop allow-list recheck. |

## Cross-cutting concerns

### Process isolation

**Current state (honest):** a Bun single-process server has **no process-level
isolation** between routes. An uncaught exception in any API route, SSR loader,
or server function is contained per-request by the global error boundary (clean
`500`, error reporter) and does **not** crash the process. What is **not**
contained:

- A handler that blocks the event loop (synchronous CPU-bound work, an
  unawaited Promise keeping the loop busy) stalls **every** route on that
  process.
- A crash in the Bun runtime or an uncaught error outside the request boundary
  (`setTimeout`, background task) takes the whole process down.

**Guarantee today:** request-handling failures are contained; event-loop
monopolization and process-level crashes are not. The framework does not
(yet) provide worker-thread or child-process isolation for routes — tracked in
[#85](https://github.com/abdelkabirouadoukou/x/issues/85). If you need hard
isolation, deploy multiple replicas (a CDN/load balancer in front is the
practical mitigant).

### Multi-tenant isolation

**Current state:** the framework assumes a **single-tenant** deployment. There
is no `tenantId`-scoped data-layer wrapper and no cross-tenant enforcement in
the runtime. If you host a multi-tenant SaaS, you must implement tenant
scoping yourself in loaders/actions/API handlers. This assumption is being
tracked in [#76](https://github.com/abdelkabirouadoukou/x/issues/76); until it
is confirmed, the framework's isolation story is single-tenant by design.

### Audit logging

**Current state:** structured JSON request logs exist (`observability.logging`)
but are **not** append-only or tamper-evident, and there is no audit-logging
facility for who did what. For compliance-bound deployments this is a gap —
tracked in [#74](https://github.com/abdelkabirouadoukou/x/issues/74). Until it
lands, treat request logs as best-effort operational telemetry, not an
accountability record. See `DATA_POLICIES.md` for the retention corollary.

### Supply chain

**Current state:** dependency CVEs are scanned in CI — `bun audit` (full +
`--prod`) and a Trivy gate that fails the build on HIGH/CRITICAL findings, plus
a scanned Docker image. Every release generates a CycloneDX SBOM (see
`CONTRIBUTING.md#sbom-on-every-release`), and `bun.lock` has a committed
integrity hash so unreviewed lockfile edits fail CI.

The Bun runtime and the npm graph are fast-moving; an SBOM + CVE gate bounds
(but does not eliminate) supply-chain risk. Pin versions (the repo pins Bun
and uses `--frozen-lockfile`), review `bun.lock` changes deliberately, and
rerun the scans on a cadence, not just at PR time.

### SLOs & DoS

The load test runs in CI with SLO gates (p95 latency and error rate — see
`BENCHMARKS.md`). That keeps performance regressions from silently landing but
is **not** a DoS mitigation: the global rate limiter (60 req/min/IP default,
Redis-backed for multi-instance) is the framework's DoS control, and it bounds
request rate, not work per request. A single expensive request still blocks the
shared process (see [Process isolation](#process-isolation)).

## Prioritized residual risks

| Risk | Likelihood | Impact | Status |
|---|---|---|---|
| Event-loop monopoly stalls all routes | medium | high | no containment; #85, deploy replicas |
| Demo auth shipped in production | medium | high | documented DEMO ONLY; must replace (`SECURITY.md`) |
| Secret in `public/` served silently | low | high | documented; env-leak scan doesn't cover `public/` |
| No audit trail for privileged actions | medium | medium | #74 |
| Multi-tenant data leakage (if multi-tenant) | conditional | critical | #76; single-tenant assumption today |
| SSRF via allow-listed host serving private data | low | medium | allow-list hygiene; hop-by-hop recheck |
| Supply-chain CVE | low | high | SBOM + Trivy + `bun audit` gates in CI |

## Independent security audit

An independent third-party security audit is **not yet commissioned**. It is
planned once the hardening backlog (process isolation #85, audit logging #74,
multi-tenant scope #76, session review #75, backpressure #89) lands, so the
audit examines the hardened state rather than the current one. When it
completes, findings will be resolved or explicitly risk-accepted and linked
here, with this document updated accordingly.

## Reporting

Vulnerabilities are handled per `SECURITY.md` (private disclosure, 90-day
coordinated window, backport policy).
