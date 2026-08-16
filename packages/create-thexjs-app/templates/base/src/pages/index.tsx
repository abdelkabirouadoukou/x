export default function Home() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "5rem 1.5rem" }}>
      <p style={{ fontWeight: 700, letterSpacing: "0.08em", color: "#e8942f" }}>THE X FRAMEWORK</p>
      <h1 style={{ fontSize: "2.6rem", lineHeight: 1.1, margin: "0.5rem 0" }}>
        You're up and running.
      </h1>
      <p style={{ fontSize: "1.15rem", lineHeight: 1.6, color: "#64748b" }}>
        This is a freshly scaffolded x app. Open <code>src/pages/index.tsx</code> and start building
        — save to hot-reload in development.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
        <a href="/about" style={btn}>
          Next steps &rarr;
        </a>
      </div>
    </main>
  );
}

const btn: React.CSSProperties = {
  display: "inline-block",
  background: "#0f172a",
  color: "#fff",
  padding: "0.7rem 1.2rem",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 600,
};
