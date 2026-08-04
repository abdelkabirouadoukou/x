import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Data Layer</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Data layer</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        x provides built-in SQLite and PostgreSQL integrations via{" "}
        <span className="text-foreground">@thexjs/core/data</span>. Connect to a database, run
        file-based migrations, and query data directly from loaders and server functions.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">SQLite</h2>
      <p className="mt-3 text-muted-foreground">
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

      <h2 className="mt-12 text-xl font-bold tracking-tight">Querying SQLite</h2>
      <p className="mt-3 text-muted-foreground">
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

      <h2 className="mt-12 text-xl font-bold tracking-tight">PostgreSQL</h2>
      <p className="mt-3 text-muted-foreground">
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

      <h2 className="mt-12 text-xl font-bold tracking-tight">Migrations</h2>
      <p className="mt-3 text-muted-foreground">
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
