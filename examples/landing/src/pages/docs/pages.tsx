import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Pages</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Pages &amp; loaders</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        x supports two page modes, static prerendering and server-side rendering, both powered by
        loaders.
      </p>

      <h2 className="text-xl">Page modes</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        By default, pages are server-rendered (SSR). Export{" "}
        <span className="text-foreground">mode = "static"</span> to prerender at build time.
      </p>

      <h2 className="text-xl">Static pages</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Static pages are rendered at build time and exported as HTML. Use this for marketing pages,
        blog posts, or any content that doesn't need per-request rendering.
      </p>
      <CodeBlock
        label="src/pages/about.tsx"
        code={`import type { RouteProps } from "@thexjs/core";

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

      <h2 className="text-xl">Server pages with loaders</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Server pages (the default) run a <span className="text-foreground">loader</span> function on
        every request. The loader can fetch data, query a database, or call an external API.
      </p>
      <CodeBlock
        label="src/pages/products.tsx"
        code={`import type { RouteProps, LoaderArgs } from "@thexjs/core";

export async function loader({ request }: LoaderArgs) {
  const res = await fetch("https://api.example.com/products");
  const products = await res.json();
  return { products };
}

export default function Products({ loaderData }: RouteProps) {
  const { products } = loaderData as { products: Array<{ id: string; name: string; price: number }> };
  return (
    <div>
      <h1 className="text-3xl font-bold">Products</h1>
      <ul className="mt-6 space-y-4">
        {products.map((p) => (
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

      <h2 className="text-xl">Loader with dynamic params</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Combined with dynamic routing, loaders receive{" "}
        <span className="text-foreground">params</span> parsed from the URL path.
      </p>
      <CodeBlock
        label="src/pages/products/[id].tsx"
        code={`import type { RouteProps, LoaderArgs } from "@thexjs/core";

export async function loader({ params }: LoaderArgs) {
  const product = await db.query(
    "SELECT * FROM products WHERE id = ?", [params.id]
  );
  if (!product) return new Response(null, { status: 404 });
  return { product };
}

export default function ProductDetail({ loaderData }: RouteProps) {
  const { product } = loaderData as { product: { name: string; description: string; price: number } };
  return (
    <div>
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="mt-2 text-muted-foreground">{product.description}</p>
      <p className="mt-4 text-2xl font-bold text-primary">${"$"}{product.price}</p>
    </div>
  );
}`}
      />

      <h2 className="text-xl">RouteProps type</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Page components receive <span className="text-foreground">RouteProps</span> with{" "}
        <span className="text-foreground">params</span> (a{" "}
        <span className="text-foreground">Record&lt;string, string&gt;</span> of dynamic segments)
        and <span className="text-foreground">loaderData</span> (the loader's return value). It is a
        plain non-generic type — cast loader data to its shape if you want inline types.
      </p>
      <CodeBlock
        label="type usage"
        code={`import type { RouteProps } from "@thexjs/core";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

export default function ProductDetail({
  loaderData,
}: RouteProps) {
  const { product } = loaderData as { product: Product };
  return (
    <div>
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="mt-2 text-muted-foreground">{product.description}</p>
      <p className="mt-4 text-2xl font-bold text-primary">${"$"}{product.price}</p>
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
