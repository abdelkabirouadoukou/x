import type { LoaderArgs, RouteProps } from "@thexjs/core";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { authenticate, setSessionCookie } from "../lib/auth";
import { cn } from "../lib/utils";

export async function loader({ request }: LoaderArgs) {
  if (request.method === "POST") {
    const formData = await request.formData();
    const username = formData.get("email") as string | null;
    const password = formData.get("password") as string | null;
    const session = username && password ? authenticate(username, password) : null;
    if (session) {
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
    const data = {
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    };
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        const err = (await res.json()) as { error?: string };
        setError(err.error || "Login failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/10">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-card-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
          </div>
          <form method="POST" action="/login" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-card-foreground mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue="admin"
                placeholder="you@example.com"
                className={cn(
                  "h-10 rounded-xl border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
                )}
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-card-foreground mb-1.5"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue="admin"
                placeholder="••••••••"
                className="h-10 rounded-xl border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            {error && (
              <p id="login-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo credentials: <code className="text-foreground">admin / admin</code>
          </p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            Demo only — replace with real auth before shipping.
          </p>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a
              href="/login"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
            >
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
