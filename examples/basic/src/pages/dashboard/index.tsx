import { useState } from "react";
import { getSession, parseSessionCookie } from "../../lib/auth";
import type { LoaderArgs, RouteProps } from "@x/core";
import Head from "../../components/Head";

export async function loader({ request }: LoaderArgs) {
  const token = parseSessionCookie(request.headers.get("Cookie"));
  const session = getSession(token);
  if (!session) {
    return new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  return { username: session.username };
}

export default function DashboardPage({ loaderData }: RouteProps) {
  const username = (loaderData?.username as string) ?? "User";
  const [greeting, setGreeting] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGreet() {
    setLoading(true);
    setGreeting("Loading...");
    try {
      const res = await fetch("/__x/actions/dashboard/greet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(["Dashboard User"]),
      });
      if (res.ok) {
        setGreeting(await res.json());
      } else {
        setGreeting("Error");
      }
    } catch {
      setGreeting("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      <Head title={`Dashboard — ${username}`} description="User dashboard" />
      <main>
        <h1>Dashboard</h1>
        <p>Welcome, {username}!</p>
        <hr />
        <h2>Server Functions Demo</h2>
        <button type="button" data-test-id="greet-btn" onClick={handleGreet} disabled={loading}>
          Greet
        </button>
        <span style={{ fontStyle: "italic", marginLeft: "0.75rem" }}>{greeting}</span>
        <hr style={{ marginTop: "2rem" }} />
        <button type="button" className="danger" onClick={handleLogout}>
          Logout
        </button>
        <p style={{ marginTop: "1rem" }}>
          <a href="/">Back home</a>
        </p>
      </main>
    </>
  );
}
