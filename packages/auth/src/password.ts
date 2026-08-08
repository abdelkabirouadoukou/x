/**
 * Password hashing helpers backed by `Bun.password` (Argon2id by default).
 * Use these inside a credentials provider's `authorize` to compare a
 * submitted password against a stored hash — never store plaintext.
 */
export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}
