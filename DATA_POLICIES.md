# Data retention & deletion policy

The framework is a **framework**, not an application: `@thexjs/*` does not
collect, store, or process end-user personal data itself. What ends up in a
database is entirely the app you build on top of it. This document states the
framework's default, the honest caveats where a template or package can touch
personal data, and the policy you should inherit when you do build on it.

## The framework's default: no PII handling by the framework

- The runtime (routing, SSR, islands, server functions, API routes, image
  proxy, rate limiting, health, metrics, logging) does **not** collect, retain,
  or transmit personal data. It stores only transient per-request state that is
  discarded when the request ends.
- Request logs (`observability.logging`) capture method, path, status, and
  duration — **not** request bodies, cookies, or headers beyond what you log
  yourself. Logs are kept for as long as your platform retains stdout, or
  however you forward them; the framework keeps no log buffer.
- Metrics (`/metrics`) are counters and histograms only: no URLs, no IPs, no
  request payloads.

So out of the box, there is no retention obligation created by the framework
itself. If you build an app that stores PII, **you** are the data controller
and the policy below is your starting point.

## Where templates and packages can touch PII (honest caveats)

| Component | What it can hold | Framework's position |
|---|---|---|
| `@thexjs/auth` | Usernames, password hashes (Argon2id), HMAC digests of session tokens, OAuth identities | The **digest** of a session token is not usable outside your app, but a **username + password hash is personal data** if your users are natural persons. You own the retention for these tables. |
| `examples/saas` template | A `sessions` table (`INSERT INTO sessions (… username …)`) | Demo data only; the demo auth is hardcoded `admin`/`admin` and DEMO ONLY (see `SECURITY.md`). Delete it before shipping. |
| `examples/basic` template | `placeholder-data.ts` seeds demo records with **names and email addresses** | Synthetic placeholders; do not seed real-person data into a production DB. |

None of the templates ship a "delete my data" flow, because none of them are
production applications. When you build the real thing, the policy below is
the floor to implement.

## Inherited policy for apps built on x

If your app stores personal data, implement at minimum:

1. **Retention limits** — a documented maximum retention window per data class
   (e.g. sessions: 30 days inactive; account data: as long as the account
   exists; audit data: per regulatory requirement). Enforce with a scheduled
   sweep, not manual process.
2. **Right-to-erasure** — a `DELETE` path keyed by user identity that removes
   the user's rows from every table that references them, in dependency order
   (sessions before accounts, etc.). The data layer's migrations are the
   schema contract this must respect.
3. **Backup hygiene** — ensure backups honor retention (an "erasure" that
   lives on in a 6-month-old backup isn't erasure). Document backup retention
   separately.
4. **Log minimization** — do not log bodies, tokens, or secrets; the
   framework already avoids this by default — keep it that way in your code.

## Deletion commitments from the framework itself

- No `@thexjs/*` package retains user data in the framework's own storage;
  per-request registries and caches are in-memory and dropped with the
  process or the request.
- The in-memory ISR page cache and rate-limiter stores are process-local and
  vanish on restart; nothing is written to disk unless *you* add a store
  (Redis, DB).

## Review cadence

This policy is reviewed whenever the templates or `@thexjs/auth` change how
personal data can be stored, and at least annually. It is part of the
governance artifacts tracked with `THREAT_MODEL.md` and `SUPPORT.md`.
