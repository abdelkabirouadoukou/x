export type ScaffoldKind =
  | "page"
  | "dynamic-page"
  | "layout"
  | "middleware"
  | "api-route"
  | "action";

export interface ScaffoldRequest {
  kind: ScaffoldKind;
  name: string;
}

function pascalCase(name: string): string {
  return name
    .split(/[-_/\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Validates a scaffold name before it is interpolated into a filesystem
 * path or a generated TypeScript identifier. Returns an error message, or
 * null when the name is safe.
 *
 * Rejects path separators and traversal ("../x"), extensions/dots
 * ("user.profile"), empty strings, leading digits ("123" would generate
 * `function 123()`), and anything outside [A-Za-z0-9_$-] that could break
 * either the path segment or the identifier.
 */
export function validateScaffoldName(name: string): string | null {
  if (name.length === 0) return "name must not be empty";
  if (name.length > 64) return "name must be at most 64 characters";
  if (/[\\/\0]/.test(name)) {
    return `name must not contain path separators or control characters (got "${name}")`;
  }
  if (name.includes(".")) {
    return `name must be a single segment without dots or extensions (got "${name}")`;
  }
  if (!/^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(name)) {
    return `name must start with a letter/underscore/$ and contain only letters, digits, -, _, or $ so it forms a valid identifier (got "${name}")`;
  }
  return null;
}

export function scaffold({ kind, name }: ScaffoldRequest): { path: string; code: string } {
  const invalid = validateScaffoldName(name);
  if (invalid) throw new Error(invalid);
  const component = pascalCase(name) || "Page";

  switch (kind) {
    case "page":
      return {
        path: `src/pages/${name}.tsx`,
        code: `export default function ${component}() {
  return <h1>${component}</h1>;
}
`,
      };

    case "dynamic-page":
      return {
        path: `src/pages/${name}/[id].tsx`,
        code: `import type { LoaderArgs, RouteProps } from "@thexjs/core";

export async function loader({ params }: LoaderArgs) {
  // fetch by params.id here
  return { id: params.id };
}

export default function ${component}({ loaderData }: RouteProps) {
  return <h1>${component} {String(loaderData?.id)}</h1>;
}
`,
      };

    case "layout":
      return {
        path: `src/pages/${name}/_layout.tsx`,
        code: `export default function ${component}Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}
`,
      };

    case "middleware":
      return {
        path: `src/pages/${name}/_middleware.ts`,
        code: `import type { MiddlewareContext, MiddlewareFn } from "@thexjs/core";

export const middleware: MiddlewareFn = async ({ request, params }: MiddlewareContext, next) => {
  // e.g. auth check / redirect / logging
  return next();
};
`,
      };

    case "api-route":
      return {
        path: `src/api/${name}.ts`,
        code: `export async function GET(req: Request) {
  return Response.json({ ok: true });
}

export async function POST(req: Request) {
  const body = await req.json();
  return Response.json({ received: body }, { status: 201 });
}
`,
      };

    case "action":
      return {
        path: `src/actions/${name}.ts`,
        code: `// Call this directly from a component: import { ${camelCase(name)} } from "../actions/${name}";
// No "use server" directive, no manual fetch — the client import is
// rewritten to a fetch wrapper at build time automatically.
export async function ${camelCase(name)}(/* args */) {
  // server-side code, db access, secrets: safe here, never bundled to client
  return { ok: true };
}
`,
      };
  }
}

function camelCase(name: string): string {
  const pas = pascalCase(name);
  return pas.charAt(0).toLowerCase() + pas.slice(1);
}
