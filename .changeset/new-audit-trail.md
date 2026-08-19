---
"@thexjs/core": patch
"@thexjs/auth": patch
---

feat: add audit logging for auth lifecycle and permission denials. `@thexjs/core` gains a pluggable `AuditSink` (`setAuditSink`, `createConsoleAuditSink`), the `audit` event emitter, and typed helpers (`auditLoginSuccess`, `auditLoginFailure`, `auditLogout`, `auditPasswordChanged`, `auditRoleChanged`, `auditPermissionDenied`, `auditSessionRevoked`). Reasons and metadata are scrubbed (sensitive keys and embedded credentials) before reaching the sink. `@thexjs/auth` now writes audit entries for sign-in success/failure, brute-force rate limiting, logout, session revocation, and RBAC permission denials; OAuth callback failures are reported instead of crashing, and also audited.