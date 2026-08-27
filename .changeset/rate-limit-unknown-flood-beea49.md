---
"@thexjs/core": patch
---

Add a flood/consequence test covering the rate-limit fallback: a single heavy client exhausting the shared "unknown" bucket (no socket IP, trusted-proxy off) also 429s unrelated requests that share the same fallback bucket. No behavior change.
