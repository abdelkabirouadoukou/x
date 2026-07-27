export default function HomePage() {
  return (
    <main>
      <h1>x</h1>
      <p>Static-first frontend, dynamic backend, one Bun process.</p>

      <section>
        <h2>Marketing / Blog (static + content collections)</h2>
        <ul>
          <li>
            <a href="/about">About — static page (mode=static)</a>
          </li>
          <li>
            <a href="/blog">Blog listing — server-rendered with loader</a>
          </li>
          <li>
            <a href="/blog/hello">Hello — content collection entry</a>
          </li>
          <li>
            <a href="/posts/hello-world">Posts/:id — server-rendered dynamic route</a>
          </li>
        </ul>
      </section>

      <section>
        <h2>Dashboard (SSR + server functions + auth)</h2>
        <ul>
          <li>
            <a href="/dashboard">Dashboard — protected, requires login</a>
          </li>
          <li>
            <a href="/login">Login page</a>
          </li>
        </ul>
      </section>
    </main>
  );
}
