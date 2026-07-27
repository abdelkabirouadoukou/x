const featuredPosts = [
  {
    slug: "hello-world",
    title: "Hello World",
    description:
      "Welcome to our blog — a space for thoughts on web development, design, and technology.",
    date: "Jul 27, 2026",
  },
  {
    slug: "getting-started",
    title: "Getting Started with x Framework",
    description: "Learn how to build your first fullstack application with x framework.",
    date: "Jul 26, 2026",
  },
  {
    slug: "tailwind-v4",
    title: "Tailwind CSS v4 — What's New",
    description: "A comprehensive look at the changes in Tailwind CSS v4.",
    date: "Jul 25, 2026",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-24">
      <section className="mx-auto max-w-4xl px-4 pt-24 text-center">
        <h1 className="bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
          The Blog
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
          Thoughts on web development, design, and technology.
        </p>
      </section>
      <section className="mx-auto max-w-4xl px-4">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight">Featured Posts</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredPosts.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-muted-foreground/30 hover:shadow-lg"
            >
              <p className="text-xs text-muted-foreground">{post.date}</p>
              <h3 className="mt-2 text-lg font-semibold text-card-foreground transition-colors group-hover:text-primary">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
            </a>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 pb-24 text-center">
        <div className="rounded-2xl border border-border bg-card p-12">
          <h2 className="text-2xl font-semibold tracking-tight">Stay Updated</h2>
          <p className="mt-2 text-muted-foreground">Get notified when new posts are published.</p>
          <div className="mx-auto mt-6 flex max-w-md gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
