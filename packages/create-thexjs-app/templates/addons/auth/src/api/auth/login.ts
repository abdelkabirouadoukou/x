import { createSession, setSessionCookie } from "../../lib/auth";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return Response.json({ error: "username and password required" }, { status: 400 });
    }

    if (username !== "admin" || password !== "admin") {
      return Response.json({ error: "invalid credentials" }, { status: 401 });
    }

    const session = createSession(username);
    return new Response(JSON.stringify({ user: { username: session.username } }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setSessionCookie(session.token),
      },
    });
  } catch (err) {
    console.error("[auth] login error:", err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
