import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 720,
        margin: "0 auto",
        padding: "2rem 1rem",
      }}
    >
      <nav style={{ marginBottom: "2rem", borderBottom: "1px solid #ccc", paddingBottom: "1rem" }}>
        <a href="/" style={{ fontWeight: "bold", textDecoration: "none", color: "#333" }}>
          x
        </a>
      </nav>
      {children}
    </div>
  );
}
