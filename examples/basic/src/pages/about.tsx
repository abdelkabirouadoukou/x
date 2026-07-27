export const mode = "static";

export default function AboutPage() {
  return (
    <main>
      <h1>About</h1>
      <p>
        This page is marked as <code>static</code> and prerendered at build time.
      </p>
      <p>
        <a href="/">Back home</a>
      </p>
    </main>
  );
}
