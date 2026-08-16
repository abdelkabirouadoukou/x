import { useState } from "react";

export default function Login() {
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
        const err = (await res.json()) as { error?: string };
        setError(err.error ?? "Login failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Sign in</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          Username
          <input name="username" defaultValue="admin" required style={field} />
        </label>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          Password
          <input name="password" type="password" defaultValue="admin" required style={field} />
        </label>
        {error && <p style={{ color: "#dc2626", fontSize: "0.85rem" }}>{error}</p>}
        <button type="submit" disabled={loading} style={submit}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "1rem" }}>
        Demo credentials: <code>admin</code> / <code>admin</code>
      </p>
    </main>
  );
}

const field: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: "0.95rem",
};

const submit: React.CSSProperties = {
  padding: "0.65rem 1rem",
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
};
