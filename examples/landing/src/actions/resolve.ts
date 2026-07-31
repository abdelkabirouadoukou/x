/**
 * Server function — runs on the Bun process, not in the browser.
 * Mirrors the client-side preview in route-resolver.tsx so a visitor can
 * confirm the resolved route actually came from the server, not just a
 * regex running locally.
 */
export async function resolveRoute(rawPath: string) {
  const receivedAt = new Date().toISOString();

  let p = rawPath
    .trim()
    .replace(/^src\//, "")
    .replace(/^\.?\//, "");

  if (p === "") {
    return { route: null, kind: "empty" as const, receivedAt };
  }

  const isApi = p.startsWith("api/");
  p = p.replace(/^pages\//, "").replace(/^api\//, "");
  p = p.replace(/\.(tsx|ts|jsx|js)$/, "");

  const base = p.split("/").pop() ?? "";

  if (base.startsWith("_layout")) {
    return { route: null, kind: "layout" as const, receivedAt };
  }
  if (base.startsWith("_middleware")) {
    return { route: null, kind: "middleware" as const, receivedAt };
  }
  if (base === "_404") {
    return { route: "*", kind: "notfound" as const, receivedAt };
  }

  let route = `/${p}`;
  route = route.replace(/\/index$/, "") || "/";
  route = route.replace(/\[\.\.\.(\w+)\]/g, ":$1*");
  route = route.replace(/\[(\w+)\]/g, ":$1");
  if (!route.startsWith("/")) route = `/${route}`;

  return {
    route,
    kind: (isApi ? "api" : "page") as "api" | "page",
    receivedAt,
  };
}
