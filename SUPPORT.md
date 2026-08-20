# Support policy

The procurement-facing contract for the `@thexjs/*` packages: what a release
means, what counts as breaking, how long a version is supported, and what you
get when something breaks. It is the companion to [`VERSIONING.md`](VERSIONING.md)
(semantic versioning mechanics) and [`SECURITY.md`](SECURITY.md) (vulnerability
response and backports) and does not override either.

## Package status

All `@thexjs/*` packages ship in **lockstep** on one versioning cycle
(see `VERSIONING.md`). There is no independent release cadence per package:

| Package | Status | Support window |
|---|---|---|
| `@thexjs/core` | 1.x | active |
| `@thexjs/auth` | 3.x | active |
| `@thexjs/env` | 1.x | active |
| `@thexjs/adapter-vercel` | 1.x | active |
| `@thexjs/cli` | 1.x | active |
| `@thexjs/hooks` | 0.x (pre-1.0) | active, stable API coming |

Pre-`1.0.0` packages (currently `@thexjs/hooks`) bump conservatively: prefer
`patch`, avoid surprise `minor`s (`VERSIONING.md`).

## What counts as a breaking change

A change is **breaking (major)** if upgrading forces a consumer to change code
or config:

- Removing or renaming an exported API or public type.
- Changing a function signature in a way that breaks existing callers.
- Changing the shape of persisted data that is not migrated.
- Changing defaults that alter observable behavior (headers, 404 rendering).
- Dropping support for a Bun version previously documented as supported.

**Non-breaking** (patch): bug fixes, internal refactors, performance work.
**New, strictly additive** features are `minor`. Full list in `VERSIONING.md`.

For procurement: treat a **major version boundary** as "you must review your
usage before upgrading." A patch or minor within a supported major is a
drop-in upgrade unless a changelog entry explicitly says otherwise.

## Support windows

- **Latest major** — fully supported: security fixes, bug fixes, new features.
- **Previous major** — security fixes (critical/high backported as patch
  releases for **12 months** after the newer major ships, or until the older
  major is retired, whichever is sooner) and best-effort medium/low fixes.
  Bug fixes and features are not backported. See `SECURITY.md`.
- **Older majors** — unsupported: no security patches. Upgrade required.
- A major's retirement is announced **at least one major in advance** and
  recorded in the changelog and `VERSIONING.md` when it happens.

## What "supported" means in practice

For the latest major:

- **Response to security issues** — per the SLA table in `SECURITY.md`
  (acknowledge within 48h; critical/high fix within 30 days of confirmation).
- **Bug fixes** — tracked as issues; severity and scheduling are at the
  maintainer's discretion. No per-issue response SLA is promised.
- **Features / requests** — via issues and the roadmap (`ROADMAP.md`); no
  commitment to ship.

The project is maintained by the individuals listed in the repo profile. It is
**not** a commercial offering: there is no paid support tier, no enterprise
contract, and no guaranteed fix SLA beyond the security one. If your
procurement needs a commercial backing, this is the honest caveat to carry
forward.

## Runtime support

`@thexjs/*` targets **Bun**. Dropping a Bun version is a breaking change
(`VERSIONING.md`). We test against the Bun version pinned in CI (see
`.github/workflows/ci.yml`) and aim to track stable Bun releases. Node.js is
not a supported runtime.

## Asking for help

- **Usage questions** — open a discussion (see `CONTRIBUTING.md`).
- **Bugs** — open an issue with a minimal repro.
- **Security issues** — never file publicly; follow `SECURITY.md`
  (private advisory, 90-day coordinated window).

## Deprecation & removal

Public API is removed in stages: `@deprecated` JSDoc → functional for at least
two minor releases or one full major → removed only in a major, with a
changelog entry naming the replacement. See `VERSIONING.md#deprecation-window`.
For procurement: deprecated APIs stay functional through the deprecation
window, so you can plan upgrades on a known timeline.
