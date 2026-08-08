/** Reads a single cookie value from a Request's `Cookie` header. */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return null;
}

/** Collects every Set-Cookie header from a Response (there may be more than one). */
export function responseCookies(res: Response): string[] {
  return typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : res.headers.get("set-cookie")
      ? [res.headers.get("set-cookie") as string]
      : [];
}

/** Extracts the value of `name` from a Set-Cookie header string. */
export function cookieValue(setCookie: string, name: string): string | null {
  const first = setCookie.split(";")[0] ?? "";
  const eq = first.indexOf("=");
  if (eq === -1 || first.slice(0, eq) !== name) return null;
  return first.slice(eq + 1);
}
