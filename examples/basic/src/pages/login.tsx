import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
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
    <main style={{ maxWidth: 400, margin: "4rem auto" }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input name="username" defaultValue="admin" required />
        </label>
        <label>
          Password
          <input name="password" type="password" defaultValue="admin" required />
        </label>
        {error && <p style={{ color: "var(--danger, #e74c3c)", fontSize: "0.875rem" }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p style={{ fontSize: "0.875rem", color: "var(--text-muted, #666)", marginTop: "1rem" }}>
        Demo credentials: admin / admin
      </p>
      <p><a href="/">Back home</a></p>
    </main>
  );
}
