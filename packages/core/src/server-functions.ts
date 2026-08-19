import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { reportException } from "./observability/monitoring";
import { routePatternToRegex } from "./router";
import { RequestBodyTooLargeError } from "./security/body-size";
import { type CsrfOptions, checkCsrf } from "./security/csrf";

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

/**
 * Snapshot of the action registry for one request. Returns a copy so a
 * concurrent dev rebuild (which mutates `ACTION_ROUTES` in place) can never
 * change the set of routes an in-flight request sees — no half-populated
 * registry, no cross-request coupling.
 */
function snapshotActionRoutes(): ActionEntry[] {
  return ACTION_ROUTES.map((entry) => ({
    routePath: entry.routePath,
    paramNames: entry.paramNames,
    fns: new Map(entry.fns),
  }));
}

export function getServerFunctionHandler(
  csrfOptions?: CsrfOptions,
): (req: Request) => Promise<Response | null> {
  return async (req: Request) => {
    if (req.method !== "POST") return null;

    const url = new URL(req.url);
    if (!url.pathname.startsWith("/__x/actions/")) return null;

    const csrfResult = checkCsrf(req, csrfOptions);
    if (!csrfResult.ok) {
      return new Response(`Forbidden: ${csrfResult.reason}`, { status: 403 });
    }

    const parts = url.pathname.replace("/__x/actions/", "").split("/");
    if (parts.length < 1) return null;

    const actionName = parts.pop();
    if (!actionName) return null;
    const concretePath = `/${parts.join("/")}`;

    for (const entry of snapshotActionRoutes()) {
      const params = extractActionParams(entry.routePath, entry.paramNames, concretePath);
      if (params === null) continue;

      const fn = entry.fns.get(actionName);
      if (!fn) return new Response("Function not found", { status: 404 });

      let args: unknown[] = [];
      try {
        const body = await req.json();
        args = Array.isArray(body) ? body : [body];
      } catch (err) {
        if (err instanceof RequestBodyTooLargeError) {
          return new Response("Payload too large", { status: 413 });
        }
        return new Response("Invalid request body", { status: 400 });
      }

      try {
        const result = await fn(...args);
        return Response.json(result);
      } catch (err) {
        reportException(err, { route: concretePath, phase: "action" });
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
      params[name] = safeDecodeURIComponent(value);
    }
    idx++;
  }
  return params;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
