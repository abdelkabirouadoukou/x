import type { RouteProps } from "@x/core";
import Link from "../components/Link";

export default function CustomNotFound(_props: RouteProps) {
  return (
    <main style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <h1 style={{ fontSize: "5rem", fontWeight: 800, color: "var(--accent, #58a6ff)", margin: "0 0 0.5rem" }}>
        404
      </h1>
      <p style={{ fontSize: "1.25rem", marginBottom: "2rem" }}>
        This page doesn't exist.
      </p>
      <Link href="/" className="btn">Back to home</Link>
    </main>
  );
}
