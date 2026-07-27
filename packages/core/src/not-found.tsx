import type { RouteProps } from "./createApp";

export default function DefaultNotFound(_props: RouteProps) {
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "4rem auto",
        padding: "0 1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "4rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#e74c3c" }}>
        404
      </h1>
      <p style={{ fontSize: "1.125rem", color: "#666", margin: "0 0 2rem" }}>
        This page could not be found.
      </p>
      <a
        href="/"
        style={{
          color: "#6ab0ff",
          textDecoration: "underline",
          fontSize: "0.875rem",
        }}
      >
        Back to home
      </a>
    </main>
  );
}
