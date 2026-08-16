---
"@thexjs/auth": patch
---

Compare OAuth `state` and session tokens with a timing-safe digest comparison
instead of a plain string equality check, so an attacker probing the state
cookie can't distinguish byte-by-byte matches from mismatches via response
timing.