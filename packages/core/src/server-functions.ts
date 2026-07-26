import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { routePatternToRegex } from "./router";

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

interface ActionEntry {
  routePath: string;
  paramNames: string[];
  fns: Map<string, (...args: unknown[]) => Promise<unknown>>;
}

const ACTION_ROUTES: ActionEntry[] = [];

export function resetServerFunctions(): void {
  ACTION_ROUTES.length = 0;
}

export function registerServerFunctions(
  routePath: string,
  paramNames: string[],
  fns: Record<string, (...args: unknown[]) => Promise<unknown>>,
): void {
  const fnMap = new Map(Object.entries(fns));
  const existing = ACTION_ROUTES.find((e) => e.routePath === routePath);
  if (existing) {
    for (const [name, fn] of fnMap) {
      existing.fns.set(name, fn);
    }
  } else {
    ACTION_ROUTES.push({ routePath, paramNames, fns: fnMap });
  }
}

export function getServerFunctionHandler(): (req: Request) => Promise<Response | null> {
  return async (req: Request) => {
    if (req.method !== "POST") return null;

    const url = new URL(req.url);
    if (!url.pathname.startsWith("/__x/actions/")) return null;

    const parts = url.pathname.replace("/__x/actions/", "").split("/");
    if (parts.length < 2) return null;

    const actionName = parts.pop();
    if (!actionName) return null;
    const concretePath = `/${parts.join("/")}`;

    for (const entry of ACTION_ROUTES) {
      const params = extractActionParams(entry.routePath, entry.paramNames, concretePath);
      if (params === null) continue;

      const fn = entry.fns.get(actionName);
      if (!fn) return new Response("Function not found", { status: 404 });

      let args: unknown[] = [];
      try {
        const body = await req.json();
        args = Array.isArray(body) ? body : [body];
      } catch {
        return new Response("Invalid request body", { status: 400 });
      }

      try {
        const result = await fn(...args);
        return Response.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal error";
        return new Response(message, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  };
}

function extractActionParams(
  routePath: string,
  paramNames: string[],
  url: string,
): Record<string, string> | null {
  const regex = routePatternToRegex(routePath);
  const match = url.match(regex);
  if (!match) return null;

  const params: Record<string, string> = {};
  let idx = 1;
  for (const name of paramNames) {
    const value = match[idx];
    if (value !== undefined) {
      params[name] = value;
    }
    idx++;
  }
  return params;
}
