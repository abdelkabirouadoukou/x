/** A normalized application user, produced by a provider's `authorize`/`profile`. */
export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
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
