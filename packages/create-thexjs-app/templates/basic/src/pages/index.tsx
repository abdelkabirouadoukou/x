export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">x</h1>
        <p className="text-muted-foreground">
          Static-first frontend, dynamic backend, one Bun process.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Marketing / Blog (static + content collections)</h2>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>
            <a href="/about" className="text-foreground hover:underline">
              About — static page (mode=static)
            </a>
          </li>
          <li>
            <a href="/blog" className="text-foreground hover:underline">
              Blog listing — server-rendered with loader
            </a>
          </li>
          <li>
            <a href="/blog/hello" className="text-foreground hover:underline">
              Hello — content collection entry
            </a>
          </li>
          <li>
            <a href="/posts/hello-world" className="text-foreground hover:underline">
              Posts/:id — server-rendered dynamic route
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Dashboard (SSR + server functions + auth)</h2>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>
            <a href="/dashboard" className="text-foreground hover:underline">
              Dashboard — protected, requires login
            </a>
          </li>
          <li>
            <a href="/login" className="text-foreground hover:underline">
              Login page
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
