---
"@thexjs/auth": patch
---

Thread the origin `Request` through `setSessionCookie(res, user, provider, req?)` and `revokeAllForUser(userId, req?)` so login-success and session-revoked audit entries capture the real origin IP + request-id instead of `null`. The optional third/fourth argument keeps programmatic/offline flows backward-compatible. Closes #169.
