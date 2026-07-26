import { clearSessionCookie, deleteSession, parseSessionCookie } from "../../../data/auth";

export async function POST(req: Request): Promise<Response> {
  const token = parseSessionCookie(req.headers.get("Cookie"));
  if (token) {
    deleteSession(token);
  }
  return new Response("OK", {
    status: 200,
    headers: { "Set-Cookie": clearSessionCookie() },
  });
}
