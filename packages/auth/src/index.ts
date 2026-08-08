export { defineAuth, SESSION_COOKIE, OAUTH_STATE_COOKIE } from "./auth";
export type {
  Auth,
  AuthConfig,
  ResolvedAuthConfig,
  HandleRequestOptions,
} from "./auth";
export {
  createSQLiteSessionStore,
  createPostgresSessionStore,
} from "./session";
export type { SessionStore, SQLiteSessionStoreOptions } from "./session";
export { hashPassword, verifyPassword } from "./password";
export { toOAuth2, buildAuthorizationUrl, exchangeCode, fetchUserInfo } from "./providers";
export type {
  Provider,
  ResolvedProvider,
  CredentialsProvider,
  OAuth2ProviderConfig,
  GitHubProviderConfig,
  OAuthTokens,
} from "./providers";
export {
  hasRole,
  hasAnyRole,
  hasPermission,
  hasAllPermissions,
  requireAuth,
  requireRole,
  requirePermission,
  toMiddleware,
} from "./rbac";
export type {
  AuthGuardResult,
  SessionGuard,
  GuardMiddlewareOptions,
} from "./rbac";
export type { AuthUser, Session } from "./types";
