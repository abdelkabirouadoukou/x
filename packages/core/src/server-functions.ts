import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function generateServerFunctionClient(
  routeFilePath: string,
  fnNames: string[],
  endpointBase: string,
): string {
  const fnCalls = fnNames
    .map(
      (name) => `
export async function ${name}(...args: unknown[]): Promise<unknown> {
  const res = await fetch("${endpointBase}/${name}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}`,
    )
    .join("\n");

  return `// Auto-generated client for server functions in ${routeFilePath}
// Do not edit.

${fnCalls}
`;
}

export function writeServerFunctionClient(
  routeFilePath: string,
  fnNames: string[],
  outDir: string,
  actionPath: string,
): string {
  const source = generateServerFunctionClient(routeFilePath, fnNames, actionPath);
  const clientPath = join(outDir, `__x_actions${actionPath.replace(/\//g, "_")}.ts`);
  writeFileSync(clientPath, source, "utf-8");
  return clientPath;
}

const ACTION_ROUTES = new Map<string, Map<string, (...args: unknown[]) => Promise<unknown>>>();

export function registerServerFunctions(
  routePath: string,
  fns: Record<string, (...args: unknown[]) => Promise<unknown>>,
): void {
  const existing = ACTION_ROUTES.get(routePath) ?? new Map();
  for (const [name, fn] of Object.entries(fns)) {
    existing.set(name, fn);
  }
  ACTION_ROUTES.set(routePath, existing);
}

export function getServerFunctionHandler(): (req: Request) => Promise<Response | null> {
  return async (req: Request) => {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/__x/actions/")) return null;

    const parts = url.pathname.replace("/__x/actions/", "").split("/");
    if (parts.length < 2) return null;

    const actionName = parts.pop();
    if (!actionName) return null;
    const routePath = `/${parts.join("/")}`;

    const routeActions = ACTION_ROUTES.get(routePath);
    if (!routeActions) return null;

    const fn = routeActions.get(actionName);
    if (!fn) return null;

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const args = (await req.json()) as unknown[];
    const result = await fn(...args);
    return Response.json(result);
  };
}
