export const metadata = {
  title: "Dashboard",
};

export default function Dashboard() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Dashboard</h1>
      <p style={{ color: "#64748b", marginBottom: "2rem" }}>
        You're signed in. This page is protected by <code>src/pages/dashboard/_middleware.ts</code>.
      </p>
      <form
        method="POST"
        action="/api/auth/logout"
        onSubmit={(e) => {
          e.preventDefault();
          fetch("/api/auth/logout", { method: "POST" }).then(() => {
            window.location.href = "/login";
          });
        }}
      >
        <button type="submit" style={btn}>
          Sign out
        </button>
      </form>
    </main>
  );
}

const btn: React.CSSProperties = {
  padding: "0.6rem 1.1rem",
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
};
