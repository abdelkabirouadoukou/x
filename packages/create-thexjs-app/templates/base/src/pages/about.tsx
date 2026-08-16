export default function About() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "5rem 1.5rem" }}>
      <p style={{ fontWeight: 700, letterSpacing: "0.08em", color: "#e8942f" }}>THE X FRAMEWORK</p>
      <h1 style={{ fontSize: "2.6rem", lineHeight: 1.1, margin: "0.5rem 0" }}>About</h1>
      <p style={{ fontSize: "1.15rem", lineHeight: 1.6, color: "#64748b" }}>
        x is a full-stack React framework built natively on Bun. File-based routing, server
        functions, ISR, and content collections — all from <code>src/pages</code>.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
        <a href="/" style={btn}>
          &larr; Back home
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
