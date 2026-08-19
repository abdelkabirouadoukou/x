---
"@thexjs/core": patch
---

Harden the image proxy further (closes #114):

- **Upstream byte cap** — new `maxBytes` option (default 10 MiB). A declared
  `Content-Length` over the cap is refused before streaming; a chunked body is
  wrapped in a counting stream that aborts (`UpstreamImageTooLargeError`) the
  instant the cap is crossed, stop reading the upstream, so an allow-listed
  host can't be used as a bandwidth-amplification vector.
- **Private/reserved address guard** — an allow-listed hostname that is itself
  a private or reserved IP literal (`10.x`, `172.16/12`, `192.168/16`,
  `169.254.169.254`, loopback, link-local, CGNAT, doc/benchmark ranges, IPv6
  ULA/link-local/loopback/multicast/v4-mapped-or-NAT64) is refused with no DNS
  involved and no lookup race. `isPrivateOrReservedAddress` is exported for
  reuse.
- **DNS-rebinding defense-in-depth** — allow-listed hostnames are resolved
  before connecting and every returned IP must be public. Default resolver is
  `Bun.dns.lookup` (RFC 2606 test names skipped; an NXDOMAIN/resolver error
  fails open — the fetch remains allow-list-bound). Override with the new
  `resolveHost` option. The check re-runs on every manual redirect hop, so a
  hop rebinding to a private target is refused before the fetch.

Full v4/v6 + DNS/IP regression coverage in `proxy.test.ts`.