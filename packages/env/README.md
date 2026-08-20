# @thexjs/env

Type-safe environment variable validation for [x](https://www.npmjs.com/package/@thexjs/core) framework apps. Define a schema once, get parsed/typed values back, and fail fast with a clear error if something's missing or malformed, instead of finding out at runtime deep in your app.

```sh
bun add @thexjs/env
```

## Quick start

```ts
// env.ts
import { createEnv, str, num, bool, oneOf, url } from "@thexjs/env";

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
env.PORT;          // number
env.NODE_ENV;       // "development" | "production" | "test"
```

If any variable is missing or fails validation, `createEnv` throws a single `Error` listing every failure at once:

```
Environment validation failed:
  server.DATABASE_URL: Expected a valid URL, got "not-a-url"
  server.PORT: Expected a number, got undefined
```

## Validators

| Validator | Accepts | Notes |
|---|---|---|
| `str()` | any non-`undefined` string | |
| `num()` | numeric strings | rejects `NaN` |
| `bool()` | `"true"` / `"1"` → `true`, `"false"` / `"0"` → `false` | anything else throws |
| `oneOf([...values])` | one of the given string literals | return type is narrowed to the literal union |
| `url()` | any string parseable by `new URL(...)` | |

Built-in validators also expose two chaining combinators:

- `.optional()` — a missing variable becomes `undefined` instead of failing;
  a present-but-invalid value still throws. `num().optional()` is typed
  `number | undefined`.
- `.default(fallback)` — a missing variable yields `fallback`; a
  present-but-invalid value still throws. `num().default(3000)` stays typed
  `number`.

```ts
const env = createEnv({
  server: {
    PORT: num().default(3000),
    SENTRY_DSN: url().optional(),
  },
  runtimeEnv: {},
});
// env.PORT === 3000, env.SENTRY_DSN === undefined
```

Each validator is just `{ parse(input: string | undefined): T }` (the `EnvValidator<T>` interface, exported as a type). Write your own for anything not covered above:

```ts
import type { EnvValidator } from "@thexjs/env";

function json<T>(): EnvValidator<T> {
  return {
    parse(input) {
      if (input === undefined) throw new Error("Expected JSON, got undefined");
      return JSON.parse(input) as T;
    },
  };
}
```

## `client` / `clientPrefix`

The `client` schema is for variables you're comfortable exposing to the browser. `clientPrefix` enforces that every client key actually starts with that prefix. A key that doesn't match fails validation, so you can't accidentally leak a server-only variable through the client schema by mistake.

When used with `@thexjs/core`, keep the default `THEXJS_PUBLIC_` prefix: the framework's build-time env isolation only lets `THEXJS_PUBLIC_`-prefixed variables reach client bundles, and any other server-only `process.env` / `Bun.env` / `import.meta.env` reference from client code fails the build with an `EnvLeakageError`.

## Notes

- Optional variables use `.optional()`; optional-with-fallback use `.default(v)` (see above). A required variable that's unset still fails validation.
- `runtimeEnv` is passed in explicitly (rather than read internally) so this works the same whether you're on Bun, in a bundler that inlines `process.env.*` at build time, or in a test with a mocked env object.

## License

MIT