import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">API Routes</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">API routes</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Build REST endpoints alongside your frontend pages. API routes live in{" "}
        <span className="text-foreground">src/api/</span> and share the same process as your pages.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">File-based API routing</h2>
      <p className="mt-3 text-muted-foreground">
        Like pages, API routes use the file system. A file at{" "}
        <span className="text-foreground">src/api/hello.ts</span> becomes{" "}
        <span className="text-foreground">/api/hello</span>.
      </p>
      <CodeBlock
        label="src/api/hello.ts"
        code={`import type { ApiHandler } from "@thexjs/core";

export const GET: ApiHandler = ({ request }) => {
  return Response.json({ message: "Hello from x!" });
};`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Request &amp; response</h2>
      <p className="mt-3 text-muted-foreground">
        Each exported HTTP method receives the request and returns a standard{" "}
        <span className="text-foreground">Response</span> object. Dynamic segments work the same as
        pages: <span className="text-foreground">api/users/[id].ts</span> →{" "}
        <span className="text-foreground">/api/users/:id</span>.
      </p>
      <CodeBlock
        label="src/api/users.ts"
        code={`import type { ApiHandler } from "@thexjs/core";

export const GET: ApiHandler = async ({ request }) => {
  const users = await db.query("SELECT * FROM users");
  return Response.json(users);
};

export const POST: ApiHandler = async ({ request }) => {
  const body = await request.json();
  const result = await db.query(
    "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *",
    [body.name, body.email]
  );
  return Response.json(result, { status: 201 });
};`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">POST endpoint example</h2>
      <CodeBlock
        label="src/api/contact.ts"
        code={`import type { ApiHandler } from "@thexjs/core";

export const POST: ApiHandler = async ({ request }) => {
  const form = await request.formData();
  const email = form.get("email");
  const message = form.get("message");

  if (!email || !message) {
    return Response.json(
      { error: "Email and message are required" },
      { status: 400 }
    );
  }

  await sendEmail({ email, message });
  return Response.json({ success: true });
};`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">API route tree</h2>
      <p className="mt-3 text-muted-foreground">
        API routes support the same file-tree conventions as pages: nested folders, dynamic
        segments, and index files.
      </p>
      <CodeBlock
        label="file tree"
        lang="tree"
        code={`src/api/
  hello.ts         -> GET /api/hello
  users.ts         -> GET, POST /api/users
  users/
    [id].ts       -> GET, PUT, DELETE /api/users/:id
  auth/
    login.ts       -> POST /api/auth/login
    register.ts    -> POST /api/auth/register`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tip">Process sharing</h2>
      <p className="mt-3 text-muted-foreground">
        API routes run in the same Bun process as your pages and server functions. This means you
        can share database connections, in-memory caches, and configuration without any network
        overhead.
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
