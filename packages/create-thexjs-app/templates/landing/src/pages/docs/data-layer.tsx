import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Data Layer</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Data layer</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        x provides built-in SQLite and PostgreSQL integrations. Connect to a database, run
        migrations, and query data directly from loaders and server functions.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">SQLite</h2>
      <p className="mt-3 text-muted-foreground">
        Use <span className="text-foreground">connectSQLite</span> to connect to a local SQLite
        database file. SQLite requires zero configuration and is perfect for development and
        single-server deployments.
      </p>
      <CodeBlock
        label="src/lib/db.ts"
        code={`import { connectSQLite, runSQLiteMigrations } from "@thexjs/core/data";

const db = connectSQLite("data/app.db");

await runSQLiteMigrations(db, [
  {
    version: 1,
    sql: \`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    \`,
  },
  {
    version: 2,
    sql: \`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        body TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    \`,
  },
]);

export { db };`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Querying SQLite</h2>
      <p className="mt-3 text-muted-foreground">
        The database object supports prepared statements with{" "}
        <span className="text-foreground">query</span> and{" "}
        <span className="text-foreground">execute</span> methods.
      </p>
      <CodeBlock
        label="src/pages/users.tsx"
        code={`import type { RouteProps, LoaderArgs } from "@thexjs/core";
import { db } from "../lib/db";

export async function loader({}: LoaderArgs) {
  const users = db.query(
    "SELECT id, name, email FROM users ORDER BY created_at DESC"
  ).all();
  return { users };
}

export default function Users({ loaderData }: RouteProps<typeof loader>) {
  return (
    <div>
      <h1 className="text-3xl font-bold">Users</h1>
      <ul className="mt-6 space-y-3">
        {loaderData.users.map((u: any) => (
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
        with a connection string. PostgreSQL provides concurrent access, connection pooling, and is
        suitable for multi-server deployments.
      </p>
      <CodeBlock
        label="src/lib/db.ts"
        code={`import { connectPostgres, runPostgresMigrations } from "@thexjs/core/data";

const db = connectPostgres({
  connectionString: process.env.DATABASE_URL,
  max: 20, // connection pool size
});

await runPostgresMigrations(db, [
  {
    version: 1,
    sql: \`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`,
  },
]);

export { db };`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Migration API</h2>
      <p className="mt-3 text-muted-foreground">
        Both <span className="text-foreground">runSQLiteMigrations</span> and{" "}
        <span className="text-foreground">runPostgresMigrations</span> take an array of migration
        objects. Each migration has a <span className="text-foreground">version</span> number
        (incrementing) and <span className="text-foreground">sql</span> string. Migrations are
        tracked and only run once.
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
