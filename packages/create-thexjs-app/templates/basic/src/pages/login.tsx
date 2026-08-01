import type { LoaderArgs, RouteProps } from "@thexjs/core";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { createSession, setSessionCookie } from "../lib/auth";

export async function loader({ request }: LoaderArgs) {
  if (request.method === "POST") {
    const formData = await request.formData();
    const username = formData.get("username") as string | null;
    const password = formData.get("password") as string | null;
    if (username === "admin" && password === "admin") {
      const session = createSession(username);
      return new Response(null, {
        status: 302,
        headers: { Location: "/dashboard", "Set-Cookie": setSessionCookie(session.token) },
      });
    }
    return { error: "Invalid credentials" };
  }
  return {};
}

export default function LoginPage({ loaderData }: RouteProps) {
  const [error, setError] = useState((loaderData?.error as string) ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const data = { username: form.username.value, password: form.password.value };
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        const err = await res.json();
        setError(err.error || "Login failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm mt-16 space-y-6">
      <h1 className="text-2xl font-bold text-center">Login</h1>
      <form method="POST" action="/login" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <Input id="username" name="username" defaultValue="admin" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input id="password" name="password" type="password" defaultValue="admin" required />
        </div>
        {error && (
          <p id="login-error" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground text-center">Demo credentials: admin / admin</p>
      <p className="text-xs text-muted-foreground text-center">
        Demo only — replace with real auth before shipping.
      </p>
      <p className="text-center">
        <a
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back home
        </a>
      </p>
    </div>
  );
}
