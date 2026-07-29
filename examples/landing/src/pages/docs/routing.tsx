import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Routing</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">File-based routing</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        x uses the file system as your route table. Drop a file in{" "}
        <span className="text-foreground">src/pages/</span>, get a route.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">How it works</h2>
      <p className="mt-3 text-muted-foreground">
        Every <span className="text-foreground">.tsx</span> file in your pages directory becomes a
        route. The file path determines the URL pattern.
      </p>

      <CodeBlock
        label="routing table"
        code={`pages/index.tsx         -> /
pages/about.tsx        -> /about
pages/contact.tsx      -> /contact
pages/blog/index.tsx   -> /blog
pages/blog/[slug].tsx  -> /blog/:slug
pages/dashboard/
  settings.tsx         -> /dashboard/settings
  profile.tsx          -> /dashboard/profile
pages/_404.tsx          -> catch-all 404`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Static routes</h2>
      <p className="mt-3 text-muted-foreground">
        Simple files map to exact URL paths.{" "}
        <span className="text-foreground">pages/about.tsx</span> becomes{" "}
        <span className="text-foreground">/about</span>.
      </p>
      <CodeBlock
        label="src/pages/about.tsx"
        code={`export default function About() {
  return <h1 className="text-3xl font-bold">About us</h1>;
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Dynamic segments</h2>
      <p className="mt-3 text-muted-foreground">
        Wrap a filename in square brackets to create a dynamic segment. The value is available via
        the <span className="text-foreground">params</span> object in loaders.
      </p>
      <CodeBlock
        label="src/pages/blog/[slug].tsx"
        code={`import type { RouteProps, LoaderArgs } from "@thexjs/core";

export async function loader({ params }: LoaderArgs) {
  const post = await getPost(params.slug);
  return { title: post.title, content: post.content };
}

export default function BlogPost({ loaderData }: RouteProps<typeof loader>) {
  return (
    <article>
      <h1 className="text-3xl font-bold">{loaderData.title}</h1>
      <div>{loaderData.content}</div>
    </article>
  );
}`}
      />
      <p className="mt-4 text-muted-foreground">
        Multiple dynamic segments work too:{" "}
        <span className="text-foreground">pages/product/[category]/[id].tsx</span> →{" "}
        <span className="text-foreground">/product/:category/:id</span>.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Nested routes with folders</h2>
      <p className="mt-3 text-muted-foreground">
        Organize routes in folders for nested URL structures. Each folder can have its own{" "}
        <span className="text-foreground">index.tsx</span>.
      </p>
      <CodeBlock
        label="file tree"
        lang="tree"
        code={`pages/dashboard/
  index.tsx           -> /dashboard
  settings.tsx        -> /dashboard/settings
  profile.tsx         -> /dashboard/profile
  billing/
    index.tsx         -> /dashboard/billing
    history.tsx       -> /dashboard/billing/history`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Catch-all 404 page</h2>
      <p className="mt-3 text-muted-foreground">
        Create <span className="text-foreground">pages/_404.tsx</span> to show a custom not-found
        page for unmatched routes.
      </p>
      <CodeBlock
        label="src/pages/_404.tsx"
        code={`export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
      <a href="/docs" className="mt-6 inline-block text-primary hover:underline">
        Go home
      </a>
    </div>
  );
}`}
      />

      <div className="mt-16 border-t border-border pt-8">
        <a
          href="/docs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to docs
        </a>
      </div>
    </div>
  );
}
