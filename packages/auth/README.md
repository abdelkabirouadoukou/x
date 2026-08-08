# @thexjs/auth

Plug-and-play authentication for [x](https://www.npmjs.com/package/@thexjs/core) framework apps. Add credentials (username/password) and OAuth2 (including GitHub) sign-in with one `defineAuth()` call, a sessions table in SQLite or Postgres via the framework's data layer, and a single catch-all API route. Passwords are hashed with Argon2 via `Bun.password`, session tokens are HMAC'd at rest, and every mutating endpoint is protected by the core CSRF module automatically.

```sh
bun add @thexjs/auth
```

## Quick start

```ts
// lib/auth.ts
import { defineAuth, createSQLiteSessionStore, hashPassword, verifyPassword } from "@thexjs/auth";

export const auth = defineAuth({
  secret: process.env.AUTH_SECRET!,
  store: createSQLiteSessionStore(), // or createPostgresSessionStore(client)
  providers: [
    {
      id: "local",
      name: "Local",
      type: "credentials",
      async authorize({ email, password }) {
        const user = await db.query("SELECT * FROM users WHERE email = ?").get(email);
        if (!user) return null;
        if (!(await verifyPassword(password, user.password_hash))) return null;
        return { id: String(user.id), name: user.name, email: user.email };
      },
    },
    {
      id: "github",
      name: "GitHub",
      type: "oauth",
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  ],
});
```

Wire it up with one catch-all API route:

```ts
// api/auth/[...auth].ts
import { auth } from "../../lib/auth";

export async function POST(req: Request) {
  return auth.handleRequest(req);
}

export async function GET(req: Request) {
  return auth.handleRequest(req);
}
```

Create users at sign-up with `hashPassword` (Argon2id) and store the hash — never plaintext:

```ts
import { hashPassword } from "@thexjs/auth";

await hashPassword("correct horse battery staple");
```

## Endpoints

`handleRequest` routes the path below `api/auth`:

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/signin/<id>` | POST | credentials provider: `application/x-www-form-urlencoded` or `multipart` body with the provider's fields (e.g. `email`, `password`) |
| `/api/auth/signin/<id>` | GET | OAuth2 provider: redirects the browser to the provider's authorization URL |
| `/api/auth/callback/<id>` | GET | OAuth2 callback: exchanges the code, validates the state challenge, signs the user in |
| `/api/auth/signout` | POST | revokes the session and clears the cookie |
| `/api/auth/session` | GET | JSON `{ "user": { ... } }` or `401` |

A sign-in form POSTs to `/api/auth/signin/local`; after success the browser follows the `302` to `successRedirect` (default `/`). For OAuth, the button/link is just a GET to `/api/auth/signin/github`.

## Reading the session

```ts
// middleware or loader
const session = await auth.getSession(request);
if (!session) return new Response("Unauthorized", { status: 401 });
session.user; // { id, name?, email? } snapshot from sign-in
```

`getSession` hashes the `x_session` cookie, looks up the token in the store, and returns `null` for expired/revoked sessions. `setSessionCookie(res, user, provider)` and `clearSessionCookie(res, req?)` are also exported for programmatic flows.

## Security

- **Passwords** — Argon2id via `Bun.password` (`hashPassword` / `verifyPassword`).
- **Session tokens** — opaque random strings; only an HMAC-SHA256 digest (`secret`) is stored, so a database leak doesn't expose usable session cookies. Tokens are random 128-bit values, revocable, and expire after `sessionMaxAge` (default 7 days).
- **OAuth state** — a `x_oauth_state` cookie challenge must match the `state` param on the callback (HMAC'd, 5-minute expiry), preventing login-CSRF / session-fixation via crafted callbacks.
- **CSRF** — POST endpoints (`signin`, `signout`) run the core `checkCsrf` (Origin/Referer verification by default; pass `requireToken` for double-submit defense in depth) and reject non-conforming requests with `403`.
- **Cookies** — `HttpOnly`, `SameSite=Lax`, `Secure` in production.

Set a **stable `secret`** in production. If omitted, a random per-process secret is generated and a warning printed, which means sessions won't survive restarts.

## Session stores

Both stores use a single `x_sessions` table and implement the `SessionStore` interface (`create`, `find`, `revoke`) if you want to bring your own.

```ts
createSQLiteSessionStore({ path: "data/auth.db" });   // default: data/auth.db
createPostgresSessionStore(connectPostgres({ url: process.env.DATABASE_URL }));
```

The Postgres store ensures the table lazily on first use and takes a client returned by `connectPostgres` from `@thexjs/core/data`, so it inherits the connection pool, TLS policy, and retry behavior of the framework.

## License

MIT
