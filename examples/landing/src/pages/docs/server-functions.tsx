import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Server Functions</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">
        Server functions
      </h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Call server-side functions from the browser without writing REST endpoints. Server functions
        live in <span className="text-foreground">src/actions/</span>. Import one into an island and
        call it like a normal function, or call it manually with{" "}
        <span className="text-foreground">fetch</span>. Both compile down to the same request.
      </p>

      <h2 className="text-xl">Defining server functions</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Create a file in <span className="text-foreground">src/actions/</span> and export named
        async functions. There is no <span className="text-foreground">"use server"</span>{" "}
        directive; arguments passed from the client arrive as JSON, and the return value is
        serialized back as JSON.
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

      <p className="mt-3 text-sm text-muted-foreground">
        Or register a map in one shot with{" "}
        <span className="text-foreground">export const actions</span>, which is handy for grouping
        several functions under one file. This also works in{" "}
        <span className="text-foreground">src/api/</span> files and page files, so a{" "}
        <span className="text-foreground">greet.ts</span> with no page component still registers its
        actions.
      </p>
      <CodeBlock
        label="src/actions/greet.ts"
        code={`export const actions = {
  greet: async (name: string) => \`Hello, ${"$"}{name}!\`,
  ping: async () => ({ pong: true }),
};`}
      />

      <h2 className="text-xl">Calling actions directly</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Import the function into an island component and call it like any other async function. When
        you run <span className="text-foreground">x build</span>, the bundler swaps the import for a
        generated fetch client before it reaches the browser, so the real implementation, db calls
        and all, never gets bundled.
      </p>
      <CodeBlock
        label="src/components/subscribe-form.tsx"
        code={`import { useState } from "react";
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
        x has no <span className="text-foreground">"use client"</span> directive. To make the form
        interactive, register it on the page with{" "}
        <span className="text-foreground">export const islands = {"{ SubscribeForm }"}</span> and
        render it inside{" "}
        <span className="text-foreground">&lt;Island name="SubscribeForm" client="load"&gt;</span>{" "}
        (see{" "}
        <a href="/docs/islands" className="text-primary underline underline-offset-2">
          Islands
        </a>
        ). Only files under <span className="text-foreground">actionsDir</span> get the
        fetch-wrapper treatment: import a regular server-only helper into client code and it bundles
        as-is; if it leaks a secret, the build-time env isolation check catches it instead.
      </p>

      <h2 className="text-xl">Calling manually with fetch</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        This is what the direct-import style compiles down to, and it works the same way in dev and
        in production: a POST request to{" "}
        <span className="text-foreground">/__x/actions/&lt;filename&gt;/&lt;functionName&gt;</span>.
        The arguments are sent as JSON in the request body.
      </p>
      <CodeBlock
        label="island component"
        code={`import { useState } from "react";

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

      <h2 className="text-xl">Server functions from loaders</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        You can also import and call server functions directly in loaders. No HTTP needed, since
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

export default function Dashboard({ loaderData }: RouteProps) {
  return <div>...</div>;
}`}
      />

      <h2 className="text-xl">Use cases</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
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
