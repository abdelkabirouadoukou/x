import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Data Layer</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Data layer</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        x provides built-in SQLite and PostgreSQL integrations via{" "}
        <span className="text-foreground">@thexjs/core/data</span>. Connect to a database, run
        file-based migrations, and query data directly from loaders and server functions.
      </p>

      <h2 className="text-xl">SQLite</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Use <span className="text-foreground">connectSQLite</span> to connect to a local SQLite
        database file. It wraps <span className="text-foreground">bun:sqlite</span> and turns on{" "}
        <span className="text-foreground">WAL</span> mode and{" "}
        <span className="text-foreground">foreign_keys</span> by default. SQLite requires zero
        configuration and is perfect for development and single-server deployments.
      </p>
      <CodeBlock
        label="src/lib/db.ts"
        code={`import { Database } from "bun:sqlite";
import { connectSQLite, runSQLiteMigrations } from "@thexjs/core/data";

const db = connectSQLite({ path: "data/app.db" });

await runSQLiteMigrations(db, "data/migrations");

export { db };

export type DB = typeof db;`}
      />

      <h2 className="text-xl">Querying SQLite</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The returned object is the standard <span className="text-foreground">bun:sqlite</span>{" "}
        <span className="text-foreground">Database</span>, so{" "}
        <span className="text-foreground">db.query(...).all()</span> and{" "}
        <span className="text-foreground">db.run(...)</span> work as expected.
      </p>
      <CodeBlock
        label="src/pages/users.tsx"
        code={`import type { RouteProps, LoaderArgs } from "@thexjs/core";
import { db } from "../lib/db";

export async function loader({}: LoaderArgs) {
  const users = db.query(
    "SELECT id, name, email FROM users ORDER BY created_at DESC",
  ).all();
  return { users };
}

export default function Users({ loaderData }: RouteProps) {
  const { users } = loaderData as {
    users: Array<{ id: string; name: string; email: string }>;
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">Users</h1>
      <ul className="mt-6 space-y-3">
        {users.map((u) => (
          <li key={u.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-semibold">{u.name}</p>
            <p className="text-sm text-muted-foreground">{u.email}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}`}
      />

      <h2 className="text-xl">PostgreSQL</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        For production deployments, use <span className="text-foreground">connectPostgres</span>{" "}
        with a <span className="text-foreground">url</span> (or the{" "}
        <span className="text-foreground">DATABASE_URL</span> env var). It wraps{" "}
        <span className="text-foreground">Bun.sql</span> with a connection pool, TLS enforcement
        (defaults to <span className="text-foreground">require</span> in production), and retry with
        backoff so the app tolerates a database that is still coming up.
      </p>
      <CodeBlock
        label="src/lib/db.ts"
        code={`import { connectPostgres, runPostgresMigrations } from "@thexjs/core/data";

const db = connectPostgres({
  url: process.env.DATABASE_URL,
  max: 20,        // connection pool size
  ssl: "verify-full",
  ca: process.env.POSTGRES_CA,   // PEM CA, for verify-ca/verify-full
  retryAttempts: 5,              // reconnect with backoff before failing
});

await runPostgresMigrations(db, "data/migrations");

export { db };`}
      />
      <p className="mt-4 text-muted-foreground">
        <span className="text-foreground">connectPostgres</span> requires Bun and will throw on
        non-Bun runtimes (such as Vercel's Node functions) — for those, connect with your own
        Postgres client and pass it around instead.
      </p>

      <h2 className="text-xl">Migrations</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Both <span className="text-foreground">runSQLiteMigrations</span> and{" "}
        <span className="text-foreground">runPostgresMigrations</span> take a directory of{" "}
        <span className="text-foreground">.sql</span> files, applied in filename order. Applied
        migrations are tracked in a <span className="text-foreground">_x_migrations</span> table and
        never re-run.
      </p>
      <CodeBlock
        label="data/migrations/"
        lang="tree"
        code={`data/migrations/
  001_create_users.sql
  002_create_posts.sql
  003_add_posts_index.sql`}
      />
      <CodeBlock
        label="data/migrations/001_create_users.sql"
        code={`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);`}
      />
      <p className="mt-4 text-muted-foreground">
        The result is a <span className="text-foreground">{"{ applied, skipped }"}</span> list of
        filenames, so you can log or test which migrations ran.
      </p>

      <h2 className="text-xl">Backup &amp; disaster recovery</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Back up the same data the app actually writes. That is the database plus — if you use{" "}
        <a href="/docs/packages/auth" className="text-primary underline underline-offset-2">
          @thexjs/auth
        </a>{" "}
        — the <span className="text-foreground">x_sessions</span> table. Migrations are not data:
        the <span className="text-foreground">_x_migrations</span> table records history, so restore
        the database and let the migration runner verify it's in the state your code expects.
      </p>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Two numbers to write down for any plan: <span className="text-foreground">RPO</span> (how
        much data you can lose — dictates backup frequency) and{" "}
        <span className="text-foreground">RTO</span> (how fast you must be back — dictates restore
        procedure). The recipes below give you the mechanics; pick schedule and retention to meet
        your own RPO/RTO.
      </p>

      <h3 className="mt-8 text-lg font-bold tracking-tight">SQLite (WAL mode)</h3>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">connectSQLite</span> enables WAL mode, which is exactly
        what you want for backups: it allows a safe, consistent file snapshot while the app keeps
        writing.{" "}
        <strong>
          Never copy the <span className="text-foreground">.db</span> file with a plain{" "}
          <span className="text-foreground">cp</span> while the app is running
        </strong>{" "}
        — you can catch the file mid-write. Three safe options, in order of preference:
      </p>
      <CodeBlock
        label="backup.sqlite.ts (hot backup, no downtime)"
        code={`import { Database } from "bun:sqlite";

const db = new Database("data/app.db");

// Online backup API: consistent snapshot while the app keeps writing.
await db.backup("backups/app-$(date -u +%FT%TZ).db");

db.close();`}
      />
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Prefer <span className="text-foreground">db.backup()</span> — it is the only option that is
        safe with zero coordination. Alternatively, from a separate shell you can use the SQLite
        <span className="text-foreground"> .backup</span> command:
      </p>
      <CodeBlock
        label=""
        lang="bash"
        code={`# Safe: consistent snapshot via SQLite itself
sqlite3 data/app.db ".backup 'backups/app-$(date -u +%FT%TZ).db'"

# Safe too: checkpoint WAL first, then copy all three files together
sqlite3 data/app.db "PRAGMA wal_checkpoint(FULL);"
cp data/app.db data/app.db-wal data/app.db-shm backups/

# NOT safe while running: a bare cp of just app.db
# cp data/app.db backups/   # <- corrupt snapshot risk`}
      />
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Restore is the reverse: stop the app, copy the snapshot back (removing any stale
        <span className="text-foreground"> -wal</span>/<span className="text-foreground">-shm</span>{" "}
        files first), then start the app. Because migrations are tracked in{" "}
        <span className="text-foreground">_x_migrations</span>, you can restore to an older snapshot
        than your current code and the runner will simply apply the missing migrations — but only{" "}
        <em>forward</em>. Restoring an older snapshot after newer migrations already ran requires
        either re-applying them or restoring a snapshot taken after they applied.
      </p>

      <h3 className="mt-8 text-lg font-bold tracking-tight">PostgreSQL</h3>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Use the platform's built-in backups (RDS automated snapshots, Neon/Cloudflare D1-style
        point-in-time recovery, Supabase backups) as the primary mechanism, plus logical{" "}
        <span className="text-foreground">pg_dump</span> for portable, schema-safe snapshots and
        cross-provider restore.
      </p>
      <CodeBlock
        label=""
        lang="bash"
        code={`# Logical backup (portable, survives provider migration)
pg_dump "$DATABASE_URL" -Fc -f backup.dump

# Restore onto a fresh database
createdb "$DATABASE_URL"   # if restoring into an empty DB
pg_restore "$DATABASE_URL" -d "$DATABASE_URL" --clean --if-exists backup.dump`}
      />
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        If you run one-off scripts from inside the app (a cron worker or a daily task), prefer the
        app's own <span className="text-foreground">connectPostgres</span> connection so the
        connection-pool, TLS, and retry settings you configured are the ones doing the work.
      </p>

      <h3 className="mt-8 text-lg font-bold tracking-tight">Runbook checklist</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
        <li>
          <strong>Test the restore, not just the backup.</strong> A backup that has never been
          restored is a guess. Restore into a scratch database as part of CI or a monthly drill and
          verify row counts and a couple of hand-picked rows.
        </li>
        <li>
          <strong>Store snapshots off the same machine.</strong> Object storage (S3/R2) or a
          separate volume; a backup on the same disk dies with the app.
        </li>
        <li>
          <strong>Back up sessions too.</strong> If{" "}
          <span className="text-foreground">@thexjs/auth</span> backs sessions with{" "}
          <span className="text-foreground">x_sessions</span>, it is part of the database backup
          automatically. If you ever point auth at a separate session store, add it to the backup
          set. Restoring an older snapshot will log everyone out (sessions created after it don't
          exist) — plan for a re-auth wave.
        </li>
        <li>
          <strong>Multi-instance deploys:</strong> SQLite is single-node. For two or more app
          instances behind a load balancer, use Postgres (or a dedicated SQLite host) so every
          instance reads the same data. Back up from one instance's maintenance window, not from a
          live replica mid-write.
        </li>
        <li>
          <strong>Write down the runbook.</strong> RTO is set by how long restore takes when you are
          panicking, so document the exact commands above somewhere your on-call can reach.
        </li>
      </ul>

      <h2 className="text-xl">Sessions, not hand-rolled</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        If you need sessions on top of this,{" "}
        <a href="/docs/packages/auth" className="text-primary underline underline-offset-2">
          @thexjs/auth
        </a>{" "}
        provides prebuilt credentials and OAuth2 (GitHub) sign-in backed by an{" "}
        <span className="text-foreground">x_sessions</span> table in SQLite or Postgres — HMAC'd,
        revocable session tokens, Argon2 password hashing, and automatic CSRF on auth endpoints —
        instead of hand-rolling your own session store.
      </p>

      <h2 className="text-xl">Per-request state contract</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        x serves every request in one persistent process, so a loader or action must not stash
        anything in module-level (file-level) variables — a cache, a counter, a "current user"
        singleton — because the next concurrent request can see it. Loaders receive their request
        context through <span className="text-foreground">LoaderArgs</span> and returned{" "}
        <span className="text-foreground">loaderData</span>; actions receive their arguments; that
        is the whole contract.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          If you need request-scoped context that crosses writes (e.g. a tracing span, a tenant id,
          a user id), key it by the values already in scope or use{" "}
          <span className="text-foreground">AsyncLocalStorage</span>, which Bun supports natively —
          the framework itself keeps no shared mutable module state.
        </li>
        <li>
          The internal registries that x does keep (island ids, server-function routes) are scoped
          per request/rebuild, and the framework ships a concurrency test that hammers N parallel
          requests with distinct identities to prove nothing leaks across requests.
        </li>
      </ul>

      <div className="mt-16 border-t border-border pt-8">
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
