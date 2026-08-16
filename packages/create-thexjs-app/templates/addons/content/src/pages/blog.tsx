import { join } from "node:path";
import { type ContentEntry, scanContent } from "@thexjs/core";

const CONTENT_DIR = process.env.X_CONTENT_DIR ?? "content";

function listContent(): ContentEntry[] {
  return scanContent(join(process.cwd(), CONTENT_DIR));
}

export default function Blog() {
  const posts = listContent();
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>Content</h1>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
        {posts.map((post) => (
          <li key={post.routePath}>
            <a
              href={post.routePath}
              style={{ textDecoration: "none", color: "#0f172a", fontWeight: 600 }}
            >
              {post.frontmatter.title ?? post.slug}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
