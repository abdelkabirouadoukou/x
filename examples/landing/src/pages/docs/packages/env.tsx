import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Packages</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">@thexjs/env</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Type-safe environment variable validation for x apps. Define a schema once, get parsed and
        typed values back, and fail fast with a clear error if something is missing or malformed.
      </p>

      <CodeBlock label="terminal" lang="bash" code="bun add @thexjs/env" />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Quick start</h2>
      <CodeBlock
        label="env.ts"
        code={`import { createEnv, str, num, bool, oneOf, url } from "@thexjs/env";

export const env = createEnv({
  server: {
    DATABASE_URL: url(),
    PORT: num(),
    NODE_ENV: oneOf(["development", "production", "test"]),
  },
  client: {
    THEXJS_PUBLIC_API_URL: url(),
  },
  clientPrefix: "THEXJS_PUBLIC_",
  runtimeEnv: process.env,
});

env.DATABASE_URL; // string, validated as a URL
env.PORT;         // number
env.NODE_ENV;     // "development" | "production" | "test"`}
      />
      <p className="mt-4 text-muted-foreground">
        If any variable is missing or fails validation,{" "}
        <span className="text-foreground">createEnv</span> throws a single error listing every
        failure:
      </p>
      <CodeBlock
        label="validation error"
        code={`Environment validation failed:
  server.DATABASE_URL: Expected a valid URL, got "not-a-url"
  server.PORT: Expected a number, got undefined`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Validators</h2>
      <CodeBlock
        label="built-in validators"
        code={`Validator              Accepts                          Notes
──────────────────────────────────────────────────────────────────────
str()                  any non-undefined string
num()                  numeric strings                  rejects NaN
bool()                 "true"/"1" → true, "false"/"0" → false
oneOf([...values])     one of the given string literals   narrows return type
url()                  string parseable by new URL(...)`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Custom validators</h2>
      <p className="mt-3 text-muted-foreground">
        Each validator is{" "}
        <span className="text-foreground">{"{ parse(input: string | undefined): T }"}</span>. Write
        your own for anything not covered:
      </p>
      <CodeBlock
        label="custom validator"
        code={`import type { EnvValidator } from "@thexjs/env";

function json<T>(): EnvValidator<T> {
  return {
    parse(input) {
      if (input === undefined) throw new Error("Expected JSON, got undefined");
      return JSON.parse(input) as T;
    },
  };
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">client / clientPrefix</h2>
      <p className="mt-3 text-muted-foreground">
        The <span className="text-foreground">client</span> schema is for variables safe to expose
        to the browser. <span className="text-foreground">clientPrefix</span> enforces that every
        client key starts with that prefix. A key that does not match fails validation, so you
        cannot accidentally leak a server-only variable through the client schema.
      </p>
      <p className="mt-4 text-muted-foreground">
        When using <span className="text-foreground">@thexjs/env</span> with a{" "}
        <span className="text-foreground">@thexjs/core</span> app, use the{" "}
        <span className="text-foreground">THEXJS_PUBLIC_</span> prefix (the default):{" "}
        <span className="text-foreground">@thexjs/core</span>'s build-time env isolation only lets
        that prefix through to client bundles, and anything else referenced from client code fails
        the build. See{" "}
        <a href="/docs/security" className="text-primary underline underline-offset-2">
          Security
        </a>{" "}
        for details.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Notes</h2>
      <ul className="mt-3 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          Every field is currently required, with no built-in{" "}
          <span className="text-foreground">optional()</span> or{" "}
          <span className="text-foreground">default()</span>. For optional vars, read from{" "}
          <span className="text-foreground">process.env</span> directly or write a validator with a
          fallback.
        </li>
        <li>
          <span className="text-foreground">runtimeEnv</span> is passed explicitly so this works on
          Bun, in bundlers that inline <span className="text-foreground">process.env.*</span> at
          build time, or in tests with a mocked env object.
        </li>
      </ul>

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
