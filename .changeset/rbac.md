---
"@thexjs/auth": minor
---

Add role-based access control. Sessions now carry `roles`/`permissions` (from the provider's user or a new `resolveRoles` hook on `defineAuth`, snapshotted at session creation). New pure helpers (`hasRole`, `hasAnyRole`, `hasPermission`, `hasAllPermissions`), fail-closed guards (`requireRole`, `requirePermission`, `requireAuth`), and middleware adapters (`toMiddleware`, plus `auth.requireRole(...)` / `auth.requirePermission(...)` / `auth.requireAuth()` / `auth.guard(...)`) that plug into the framework's route middleware. Signed out → 401, authenticated but unauthorized → 403, optional `redirectTo` for signed-out users.
