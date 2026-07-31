import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Server Functions
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Server functions</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Call server-side functions from the browser without writing REST endpoints. Server functions
        live in <span className="text-foreground">src/actions/</span>. Import one into a client
        component and call it like a normal function, or call it manually with{" "}
        <span className="text-foreground">fetch</span> — both compile down to the same request.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Defining server functions</h2>
      <p className="mt-3 text-muted-foreground">
        Create a file in <span className="text-foreground">src/actions/</span> and export named
        async functions. Each function receives a <span className="text-foreground">Request</span>{" "}
        object and any arguments you pass.
      </p>
      <CodeBlock
        label="src/actions/greet.ts"
        code={`export async function greet(name: string) {
  return \`Hello, ${"$"}{name}! The server time is ${"$"}{new Date().toISOString()}.\`;
}

export async function sendEmail({ to, subject, body }: {
  to: string;
  subject: string;
  body: string;
}) {
  // send email logic
  return { sent: true, to };
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Calling actions directly</h2>
      <p className="mt-3 text-muted-foreground">
        Import the function into a client component and call it like any other async function. When
        you run <span className="text-foreground">x build</span>, the bundler swaps the import for a
        generated fetch client before it reaches the browser, so the real implementation, db calls
        and all, never gets bundled.
      </p>
      <CodeBlock
        label="client component"
        code={`"use client";

import { useState } from "react";
import { subscribeUser } from "../actions/subscribe";

export default function SubscribeForm() {
  const [status, setStatus] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const email = form.get("email") as string;

    await subscribeUser(email);
    setStatus("Subscribed!");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="email"
        type="email"
        placeholder="you@example.com"
        className="rounded-xl border border-border bg-card px-4 py-2"
      />
      <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">
        Subscribe
      </button>
      {status && <p className="text-muted-foreground">{status}</p>}
    </form>
  );
}`}
      />
      <p className="mt-3 text-sm text-muted-foreground">
        Only files under <span className="text-foreground">actionsDir</span> get this treatment.
        Import a regular server-only helper into client code and it bundles as-is; if it leaks a
        secret, the build-time env isolation check catches it instead.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Calling manually with fetch</h2>
      <p className="mt-3 text-muted-foreground">
        This is what the direct-import style compiles down to, and it works the same way in dev and
        in production: a POST request to{" "}
        <span className="text-foreground">/__x/actions/&lt;filename&gt;/&lt;functionName&gt;</span>.
        The arguments are sent as JSON in the request body.
      </p>
      <CodeBlock
        label="client component"
        code={`"use client";

import { useState } from "react";

export default function GreetForm() {
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const name = form.get("name");

    const res = await fetch("/__x/actions/greet/greet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([name]),
    });

    const data = await res.text();
    setMessage(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="name"
        placeholder="Enter your name"
        className="rounded-xl border border-border bg-card px-4 py-2"
      />
      <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">
        Greet me
      </button>
      {message && <p className="text-muted-foreground">{message}</p>}
    </form>
  );
}`}
      />
      <p className="mt-3 text-sm text-muted-foreground">
        Reach for this style directly when you're calling an action from outside an island, or
        anywhere you'd rather see the request explicitly.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Server functions from loaders</h2>
      <p className="mt-3 text-muted-foreground">
        You can also import and call server functions directly in loaders — no HTTP needed since
        they share the same process.
      </p>
      <CodeBlock
        label="src/pages/dashboard.tsx"
        code={`import type { RouteProps, LoaderArgs } from "@thexjs/core";
import { getDashboardData } from "../actions/dashboard";

export async function loader({ request }: LoaderArgs) {
  const data = await getDashboardData();
  return { data };
}

export default function Dashboard({ loaderData }: RouteProps<typeof loader>) {
  return <div>...</div>;
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Use cases</h2>
      <p className="mt-3 text-muted-foreground">
        Server functions are ideal for form handling, sending emails, database mutations, and any
        server-side logic that doesn't need a dedicated REST API. They reduce boilerplate and keep
        your client code simple.
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
