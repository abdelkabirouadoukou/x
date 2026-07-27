import type { RouteProps } from "@x/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export default function DocPage({}: RouteProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pages</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Pages &amp; loaders</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        x supports two page modes — static prerendering and server-side rendering — both powered by
        loaders.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Page modes</h2>
      <p className="mt-3 text-muted-foreground">
        By default, pages are server-rendered (SSR). Export{" "}
        <span className="text-foreground">mode = "static"</span> to prerender at build time.
      </p>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Static pages</h2>
      <p className="mt-3 text-muted-foreground">
        Static pages are rendered at build time and exported as HTML. Use this for marketing pages,
        blog posts, or any content that doesn't need per-request rendering.
      </p>
      <CodeBlock
        label="src/pages/about.tsx"
        code={`import type { RouteProps } from "@x/core";

export const mode = "static";

export default function About({}: RouteProps) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="text-4xl font-bold">About</h1>
      <p className="mt-4 text-muted-foreground">
        This page is prerendered at build time.
      </p>
    </div>
  );
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Server pages with loaders</h2>
      <p className="mt-3 text-muted-foreground">
        Server pages (the default) run a <span className="text-foreground">loader</span> function on
        every request. The loader can fetch data, query a database, or call an external API.
      </p>
      <CodeBlock
        label="src/pages/products.tsx"
        code={`import type { RouteProps, LoaderArgs } from "@x/core";

export async function loader({ request }: LoaderArgs) {
  const res = await fetch("https://api.example.com/products");
  const products = await res.json();
  return { products };
}

export default function Products({ loaderData }: RouteProps<typeof loader>) {
  return (
    <div>
      <h1 className="text-3xl font-bold">Products</h1>
      <ul className="mt-6 space-y-4">
        {loaderData.products.map((p: any) => (
          <li key={p.id} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-sm text-muted-foreground">{p.price}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">Loader with dynamic params</h2>
      <p className="mt-3 text-muted-foreground">
        Combined with dynamic routing, loaders receive{" "}
        <span className="text-foreground">params</span> parsed from the URL path.
      </p>
      <CodeBlock
        label="src/pages/products/[id].tsx"
        code={`import type { RouteProps, LoaderArgs } from "@x/core";

export async function loader({ params }: LoaderArgs) {
  const product = await db.query(
    "SELECT * FROM products WHERE id = ?", [params.id]
  );
  if (!product) throw new Response(null, { status: 404 });
  return { product };
}

export default function ProductDetail({ loaderData }: RouteProps<typeof loader>) {
  const { product } = loaderData;
  return (
    <div>
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="mt-2 text-muted-foreground">{product.description}</p>
      <p className="mt-4 text-2xl font-bold text-primary">${"$"}{product.price}</p>
    </div>
  );
}`}
      />

      <h2 className="mt-12 text-xl font-bold tracking-tight">RouteProps type</h2>
      <p className="mt-3 text-muted-foreground">
        The <span className="text-foreground">RouteProps</span> type provides typed access to{" "}
        <span className="text-foreground">loaderData</span>,{" "}
        <span className="text-foreground">params</span>, and{" "}
        <span className="text-foreground">request</span>. Pass your loader function as the type
        parameter for full type safety.
      </p>
      <CodeBlock
        label="type usage"
        code={`import type { RouteProps } from "@x/core";

// loaderData is automatically typed via the generic
export default function Page({ loaderData, params, request }: RouteProps<typeof loader>) {
  // loaderData has the return type of loader()
  // params has the dynamic segment types
  // request is the standard Request object
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
