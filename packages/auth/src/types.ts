/** A normalized application user, produced by a provider's `authorize`/`profile`. */
export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  /**
   * Roles granted to this user (e.g. `"admin"`, `"editor"`). Resolved by the
   * auth instance's `resolveRoles` hook at session creation and snapshotted
   * into the session so guards don't need a per-request lookup.
   */
  roles?: string[];
  /** Fine-grained permissions granted to this user (e.g. `"posts:write"`). */
  permissions?: string[];
  [key: string]: unknown;
}

/** A persisted session record. */
export interface Session {
  token: string;
  userId: string;
  provider: string;
  expiresAt: number;
  createdAt: number;
  /** Snapshot of the user at sign-in time, so loaders/middleware don't need a second lookup. */
  user: AuthUser;
}
