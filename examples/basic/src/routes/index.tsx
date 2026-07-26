export default function HomePage() {
  return (
    <main>
      <h1>x</h1>
      <p>Static-first frontend, dynamic backend, one Bun process.</p>
      <ul>
        <li>
          <a href="/about">Static page (mode=static)</a>
        </li>
        <li>
          <a href="/posts/hello-world">Dynamic page /posts/:id</a>
        </li>
        <li>
          <a href="/blog/hello">Content collection entry</a>
        </li>
      </ul>
    </main>
  );
}
