import { createSession, setSessionCookie } from "../../lib/auth";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: "email and password required" }, { status: 400 });
    }

    if (email !== "admin" || password !== "admin") {
      return Response.json({ error: "invalid credentials" }, { status: 401 });
    }

    const session = createSession(email);
    const cookie = setSessionCookie(session.token);
    return new Response(JSON.stringify({ user: { username: session.username } }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    });
  } catch (err) {
    console.error("[auth] login error:", err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
