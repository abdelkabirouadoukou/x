import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Packages</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">@thexjs/auth</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Plug-and-play authentication for X apps. Add credentials (username/password) and OAuth2,
        including a preconfigured GitHub provider, with one{" "}
        <span className="text-foreground">defineAuth()</span> call, a sessions table in SQLite or
        Postgres via the framework's data layer, and a single catch-all API route.
      </p>

      <CodeBlock label="terminal" lang="bash" code="bun add @thexjs/auth" />

      <h2 className="text-xl">Quick start</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Define your providers and session store once:
      </p>
      <CodeBlock
        label="lib/auth.ts"
        code={`import { defineAuth, createSQLiteSessionStore, hashPassword, verifyPassword } from "@thexjs/auth";

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
});`}
      />
      <p className="mt-4 text-muted-foreground">
        The <span className="text-foreground">github</span> provider is a preset: give it a client
        ID and secret and the authorization, token, and user-info URLs are wired up for you. A
        generic OAuth2 provider is available too for any other authorization-code provider.
      </p>
      <p className="mt-4 text-muted-foreground">Wire it up with one catch-all API route:</p>
      <CodeBlock
        label="api/auth/[...auth].ts"
        code={`import { auth } from "../../lib/auth";

export async function POST(req: Request) {
  return auth.handleRequest(req);
}

export async function GET(req: Request) {
  return auth.handleRequest(req);
}`}
      />
      <p className="mt-4 text-muted-foreground">
        Create users at sign-up with <span className="text-foreground">hashPassword</span>{" "}
        (Argon2id) and store the hash, never the plaintext:
      </p>
      <CodeBlock
        label="signup"
        code={`import { hashPassword } from "@thexjs/auth";

await hashPassword("correct horse battery staple");`}
      />

      <h2 className="text-xl">Endpoints</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">handleRequest</span> routes the path below{" "}
        <span className="text-foreground">api/auth</span>:
      </p>
      <CodeBlock
        label="routes"
        code={`Route                        Method  Purpose
──────────────────────────────────────────────────────────────
/api/auth/signin/<id>        POST    credentials provider: form or multipart body with the
                                     provider's fields (e.g. email, password)
/api/auth/signin/<id>        GET     OAuth2 provider: redirects the browser to the provider's
                                     authorization URL
/api/auth/callback/<id>      GET     OAuth2 callback: exchanges the code, validates the state
                                     challenge, signs the user in
/api/auth/signout            POST    revokes the session and clears the cookie
/api/auth/session            GET     JSON { "user": { ... } } or 401`}
      />
      <p className="mt-4 text-muted-foreground">
        A sign-in form POSTs to <span className="text-foreground">/api/auth/signin/local</span>
        and, after success, the browser follows the <span className="text-foreground">302</span> to{" "}
        <span className="text-foreground">successRedirect</span> (default{" "}
        <span className="text-foreground">/</span>). For OAuth, the button or link is just a GET to{" "}
        <span className="text-foreground">/api/auth/signin/github</span>.
      </p>

      <h2 className="text-xl">Reading the session</h2>
      <CodeBlock
        label="middleware or loader"
        code={`const session = await auth.getSession(request);
if (!session) return new Response("Unauthorized", { status: 401 });
session.user; // { id, name?, email? } snapshot from sign-in`}
      />
      <p className="mt-4 text-muted-foreground">
        <span className="text-foreground">getSession</span> hashes the{" "}
        <span className="text-foreground">x_session</span> cookie, looks up the token in the store,
        and returns <span className="text-foreground">null</span> for expired or revoked sessions.
        For programmatic flows, the <span className="text-foreground">defineAuth()</span> result
        also exposes <span className="text-foreground">setSessionCookie(res, user, provider)</span>{" "}
        and <span className="text-foreground">clearSessionCookie(res, req?)</span>.
      </p>

      <h2 className="text-xl">Security</h2>
      <ul className="mt-3 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">Passwords</span> are Argon2id via{" "}
          <span className="text-foreground">Bun.password</span> ({" "}
          <span className="text-foreground">hashPassword</span> /{" "}
          <span className="text-foreground">verifyPassword</span>).
        </li>
        <li>
          <span className="text-foreground">Session tokens</span> are opaque random strings; only an
          HMAC-SHA256 digest (keyed by <span className="text-foreground">secret</span>) is stored,
          so a database leak doesn't expose usable session cookies. Tokens are random 128-bit
          values, revocable, and expire after <span className="text-foreground">sessionMaxAge</span>{" "}
          (default 7 days).
        </li>
        <li>
          <span className="text-foreground">OAuth state</span>: an{" "}
          <span className="text-foreground">x_oauth_state</span> cookie challenge must match the{" "}
          <span className="text-foreground">state</span> param on the callback (HMAC'd, 5-minute
          expiry), preventing login-CSRF and session-fixation via crafted callbacks.
        </li>
        <li>
          <span className="text-foreground">CSRF</span>: POST endpoints ({" "}
          <span className="text-foreground">signin</span>,{" "}
          <span className="text-foreground">signout</span> ) run the core{" "}
          <span className="text-foreground">checkCsrf</span> automatically: Origin/Referer
          verification by default, or <span className="text-foreground">requireToken</span> for
          double-submit defense in depth, and it rejects non-conforming requests with{" "}
          <span className="text-foreground">403</span>. See{" "}
          <a href="/docs/security" className="text-primary underline underline-offset-2">
            Security
          </a>{" "}
          for how the module is configured.
        </li>
        <li>
          <span className="text-foreground">Cookies</span> are{" "}
          <span className="text-foreground">HttpOnly</span>,{" "}
          <span className="text-foreground">SameSite=Lax</span>,{" "}
          <span className="text-foreground">Secure</span> in production.
        </li>
      </ul>
      <p className="mt-4 text-muted-foreground">
        Set a stable <span className="text-foreground">secret</span> in production. If omitted, a
        random per-process secret is generated and a warning is printed, which means sessions won't
        survive restarts.
      </p>

      <h2 className="text-xl">Session stores</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Both stores use a single <span className="text-foreground">x_sessions</span> table and
        implement the <span className="text-foreground">SessionStore</span> interface ({" "}
        <span className="text-foreground">create</span>,{" "}
        <span className="text-foreground">find</span>,{" "}
        <span className="text-foreground">revoke</span>), so you can bring your own:
      </p>
      <CodeBlock
        label="stores"
        code={`createSQLiteSessionStore({ path: "data/auth.db" });   // default: data/auth.db
createPostgresSessionStore(connectPostgres({ url: process.env.DATABASE_URL }));`}
      />
      <p className="mt-4 text-muted-foreground">
        The Postgres store ensures the table lazily on first use and takes a client returned by{" "}
        <span className="text-foreground">connectPostgres</span> from{" "}
        <span className="text-foreground">@thexjs/core/data</span>, so it inherits the connection
        pool, TLS policy, and retry behavior of the framework. See{" "}
        <a href="/docs/data-layer" className="text-primary underline underline-offset-2">
          Data Layer
        </a>{" "}
        for the underlying stores.
      </p>

      <h2 className="text-xl">Route guards</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The auth object turns session checks into framework middleware.{" "}
        <span className="text-foreground">auth.requireAuth()</span>,{" "}
        <span className="text-foreground">auth.requireRole()</span>, and{" "}
        <span className="text-foreground">auth.requirePermission()</span> each return a{" "}
        <span className="text-foreground">MiddlewareFn</span>: failing checks short-circuit with a
        401/403, or a 302 when you pass <span className="text-foreground">redirectTo</span>. Drop
        them in a <span className="text-foreground">_middleware.ts</span> to guard everything in a
        folder:
      </p>
      <CodeBlock
        label="src/pages/dashboard/_middleware.ts"
        code={`import { auth } from "../../lib/auth";

export const middleware = auth.requireRole("admin", {
  redirectTo: "/signin",
});`}
      />
      <p className="mt-3 text-sm text-muted-foreground">
        Denied-but-signed-in attempts are written to the audit trail automatically, so permission
        failures are reviewable after the fact.
      </p>

      <h2 className="text-xl">Brute-force protection</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">createBruteForceGuard</span> tracks failed sign-ins in two
        separate buckets: one per account identifier, one per client IP (so one IP spraying many
        accounts locks out fast). Defaults: 5 attempts per 15-minute window.
      </p>
      <CodeBlock
        label="guarding the credentials flow"
        code={`import { createBruteForceGuard } from "@thexjs/auth";

const guard = createBruteForceGuard({ maxAttempts: 5, windowMs: 15 * 60_000 });

// before verifying a password — check the account bucket and the IP bucket:
const account = guard.accountKey(email);
if (!guard.status(account).ok || !guard.status(guard.ipKey(req)).ok) {
  return Response.json({ error: "Too many attempts" }, { status: 429 });
}

// after a failed verification:
guard.recordFailure(account);`}
      />

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/packages/core"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          @thexjs/core <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <a
          href="/docs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to docs
        </a>
      </div>
    </div>
  );
}
