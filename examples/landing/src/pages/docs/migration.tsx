import type { RouteProps } from "@thexjs/core";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Migration Guide
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Migrate an existing app to x
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Move a Next.js or TanStack app to x piece by piece. x shares the file-based, React-islands
        model you already know, so most of your components, loaders, and API routes port over with
        minimal churn.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Conceptual mapping</h2>
      <p className="mt-3 text-muted-foreground">
        x is built around the same ideas you already use, under slightly different names:
      </p>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Next.js / Remix</th>
              <th className="px-4 py-3">x</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-muted-foreground">
            <tr>
              <td className="px-4 py-3 text-foreground">app/ or pages/ dir</td>
              <td className="px-4 py-3 text-foreground">src/pages</td>
              <td className="px-4 py-3">
                File-based routes; <code>_layout.tsx</code> layers nest by directory.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">getServerSideProps / loader()</td>
              <td className="px-4 py-3 text-foreground">loader()</td>
              <td className="px-4 py-3">
                Same contract: async, receives params/request, returns data.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">export const revalidate / ISR</td>
              <td className="px-4 py-3 text-foreground">export const revalidate</td>
              <td className="px-4 py-3">Identical semantics: static page + N-second cache.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">Server Actions</td>
              <td className="px-4 py-3 text-foreground">Server functions</td>
              <td className="px-4 py-3">Async exports under src/actions become POST endpoints.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">route.ts / api/ handlers</td>
              <td className="px-4 py-3 text-foreground">src/api/*.ts</td>
              <td className="px-4 py-3">Named GET/POST/PUT/PATCH/DELETE exports.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">middleware.ts</td>
              <td className="px-4 py-3 text-foreground">Middleware</td>
              <td className="px-4 py-3">
                _middleware.ts or export const middleware; onion pattern.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">
                Client components with hydration boundaries
              </td>
              <td className="px-4 py-3 text-foreground">Islands</td>
              <td className="px-4 py-3">
                export const islands in a page; <code>&lt;Island&gt;</code> hydrates them.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-xl font-bold tracking-tight">1. Scaffold the shell</h2>
      <p className="mt-3 text-muted-foreground">
        Create a fresh x project and copy your package files, styles, and public assets into it:
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`bun create thexjs-app@latest my-app
cd my-app
cp -r old-project/public .
cp old-project/x.config.ts . 2>/dev/null || true`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">2. Port your data layer</h2>
      <p className="mt-3 text-muted-foreground">
        Move schemas into versioned SQL migration files and run them at boot. x ships migration
        runners for both SQLite and Postgres that track applied files in a{" "}
        <span className="text-foreground">_x_migrations</span> table:
      </p>
      <CodeBlock
        label="data/migrations/001_create_users.sql"
        lang="sql"
        code={`CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT
);`}
      />
      <CodeBlock
        label="src/lib/db.ts"
        lang="ts"
        code={`import { connectSQLite, runSQLiteMigrations } from "@thexjs/core/data";
import { join } from "node:path";

const db = connectSQLite(process.env.SQLITE_PATH ?? "./data/app.db");
runSQLiteMigrations(db, join(import.meta.dir, "..", "data", "migrations"));
export default db;`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">3. Port pages + loaders</h2>
      <p className="mt-3 text-muted-foreground">
        A server-rendered page with a loader is almost identical to the Next.js version. Change the
        export name and drop the framework-specific glue:
      </p>
      <CodeBlock
        label="src/pages/posts/[slug].tsx"
        lang="tsx"
        code={`import type { LoaderArgs, RouteProps } from "@thexjs/core";
import db from "../lib/db";

export async function loader({ params }: LoaderArgs) {
  const post = db.query("SELECT * FROM posts WHERE slug = ?").get(params.slug);
  if (!post) return { status: 404 };
  return post;
}

export default function Post({ loaderData }: RouteProps) {
  const post = loaderData as { title: string; body: string };
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  );
}`}
      />
      <p className="mt-4 text-muted-foreground">
        Static pages set <code>export const mode = "static"</code> and{" "}
        <code>export const revalidate</code> for time-based regeneration, just like ISR:
      </p>
      <CodeBlock
        label="src/pages/blog.tsx"
        lang="tsx"
        code={`export const mode = "static";
export const revalidate = 3600;`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">4. Server functions</h2>
      <p className="mt-3 text-muted-foreground">
        Fold per-route server actions into a shared module under{" "}
        <span className="text-foreground">src/actions</span>. Call them from loaders, API routes,
        forms, or islands -- the client bundle only ships a <code>fetch()</code> wrapper, never the
        server implementation:
      </p>
      <CodeBlock
        label="src/actions/newsletter.ts"
        lang="ts"
        code={`export async function subscribe(email: string) {
  const user = await db.query("SELECT id FROM users WHERE email = ?").get(email);
  if (!user) throw new Error("No account found for that email");
  await db.run("INSERT INTO subscribers (email) VALUES (?)", [email]);
  return { ok: true };
}`}
      />
      <CodeBlock
        label="src/pages/newsletter.tsx"
        lang="tsx"
        code={`import { subscribe } from "../actions/newsletter";

export const islands = { Form };

function Form() {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      subscribe(new FormData(e.currentTarget).get("email"));
    }}>
      <input name="email" type="email" />
      <button>Subscribe</button>
    </form>
  );
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">5. API routes</h2>
      <p className="mt-3 text-muted-foreground">
        Replace <code>route.ts</code> handlers with named export functions in{" "}
        <span className="text-foreground">src/api</span>. Each receives the{" "}
        <span className="text-foreground">Request</span> and returns a{" "}
        <span className="text-foreground">Response</span>:
      </p>
      <CodeBlock
        label="src/api/health.ts"
        lang="ts"
        code={`export function GET(request: Request) {
  return Response.json({ ok: true, ts: Date.now() });
}

export async function POST(request: Request) {
  const body = await request.json();
  // ...
  return Response.json({ received: true }, { status: 201 });
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">6. Build, doctor, deploy</h2>
      <p className="mt-3 text-muted-foreground">
        Run the diagnostics command to catch env-isolation violations, missing dirs, or dependency
        mismatches before you build, then ship like you did before:
      </p>
      <CodeBlock
        label="terminal"
        lang="bash"
        code={`x doctor          # config, dirs, env isolation, deps
x build           # -> .x/client + .x/server (Bun server)
x build --adapter vercel   # -> .vercel/output Build Output API v3`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">What doesn't change</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
        <li>
          React stays React -- x renders with <span className="text-foreground">react-dom</span>{" "}
          server-side and hydrates islands client-side.
        </li>
        <li>
          Plain CSS, Tailwind (compiled by the dev server), and content collections slot in as-is.
        </li>
        <li>
          Your environment split: variables prefixed{" "}
          <span className="text-foreground">THEXJS_PUBLIC_</span> reach the client; everything else
          stays server-only.
        </li>
        <li>Deploy targets: a self-hosted Bun server, or Vercel via the bundled adapter.</li>
      </ul>

      <div className="mt-12 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Next step: read the{" "}
          <a href="/docs/getting-started" className="text-primary underline underline-offset-2">
            Getting Started
          </a>{" "}
          guide for the full walkthrough, or jump into{" "}
          <a href="/docs/server-functions" className="text-primary underline underline-offset-2">
            Server Functions
          </a>
          . If something from your framework doesn't map cleanly, open an issue -- the migration
          story is being actively tuned.
        </p>
      </div>
    </div>
  );
}
