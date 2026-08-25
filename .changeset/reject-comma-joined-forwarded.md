---
"@thexjs/adapter-vercel": patch
---

Reject comma-joined forwarded headers instead of truncating them. A scalar `x-forwarded-host` like `a.com, b.com` was previously cut at the first comma and the leftmost value validated and trusted; the fail-closed policy now falls back to connection metadata for any comma-containing value. Follow-up to Copilot review on #212.
