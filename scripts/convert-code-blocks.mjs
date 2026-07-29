import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, "..", "examples", "landing", "src", "pages", "docs");

const files = [
  "getting-started.tsx",
  "routing.tsx",
  "pages.tsx",
  "layouts.tsx",
  "api-routes.tsx",
  "server-functions.tsx",
  "content-collections.tsx",
  "middleware.tsx",
  "data-layer.tsx",
  "build-deploy.tsx",
  "configuration.tsx",
];

// Manual code block replacements for each file
const replacements = {
  "getting-started.tsx": [
    // terminal 1
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">terminal</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            <span className="text-primary">$</span> bun create thexjs-app@latest my-app{"\\n"}
            <span className="text-primary">$</span> cd my-app{"\\n"}
            <span className="text-primary">$</span> x dev
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="terminal" lang="bash" code={\`bun create thexjs-app@latest my-app
cd my-app
bun run dev\`} />`,
    ],
    // terminal 2 (manual setup)
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">terminal</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            <span className="text-primary">$</span> mkdir my-app {"&&"} cd my-app{"\\n"}
            <span className="text-primary">$</span> bun init -y{"\\n"}
            <span className="text-primary">$</span> bun add @x/core{"\\n"}
            <span className="text-primary">$</span> cat {"<<"} EOF {'>'} x.config.ts{"\\n"}
            {"import { defineConfig } from \\"@x/core\\";"}{"\\n"}
            {"export default defineConfig({"}{"\\n"}
            {"  pagesDir: \\"src/pages\\","}{"\\n"}
            {"});"}{"\\n"}
            EOF
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="terminal" lang="bash" code={\`mkdir my-app && cd my-app
bun init -y
bun add @x/core
cat << EOF > x.config.ts
import { defineConfig } from "@x/core";
export default defineConfig({
  pagesDir: "src/pages",
});
EOF\`} />`,
    ],
    // file tree
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">file tree</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            {"my-app/"}{"\\n"}
            {"  x.config.ts"}{"\\n"}
            {"  src/"}{"\\n"}
            {"    pages/"}  <span className="text-muted-foreground">{"  // File-based routes"}</span>{"\\n"}
            {"      index.tsx"}{"\\n"}
            {"      about.tsx"}{"\\n"}
            {"      _404.tsx"}{"\\n"}
            {"      blog/"}{"\\n"}
            {"        [slug].tsx"}{"\\n"}
            {"    layouts/"}  <span className="text-muted-foreground">{" // Nested layouts"}</span>{"\\n"}
            {"      main.tsx"}{"\\n"}
            {"    api/"}  <span className="text-muted-foreground">{"    // API routes"}</span>{"\\n"}
            {"      hello.ts"}{"\\n"}
            {"    actions/"}  <span className="text-muted-foreground">{" // Server functions"}</span>{"\\n"}
            {"      greet.ts"}{"\\n"}
            {"  content/"}  <span className="text-muted-foreground">{"  // Markdown content"}</span>{"\\n"}
            {"    posts/"}{"\\n"}
            {"      hello-world.md"}{"\\n"}
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="file tree" lang="tree" code={\`my-app/
  x.config.ts
  src/
    pages/  // File-based routes
      index.tsx
      about.tsx
      _404.tsx
      blog/
        [slug].tsx
    layouts/ // Nested layouts
      main.tsx
    api/    // API routes
      hello.ts
    actions/ // Server functions
      greet.ts
  content/  // Markdown content
    posts/
      hello-world.md\`} />`,
    ],
    // first page code
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">src/pages/index.tsx</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            {"export default function Home() {"}{"\\n"}
            {"  return ("}{"\\n"}
            {"    <div>"}{"\\n"}
            {"      <h1 className=\\"text-4xl font-bold\\">Hello x!</h1>"}{"\\n"}
            {"      <p className=\\"text-muted-foreground\\">Welcome to your new app.</p>"}{"\\n"}
            {"    </div>"}{"\\n"}
            {"  );"}{"\\n"}
            {"}"}
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="src/pages/index.tsx" code={\`export default function Home() {
  return (
    <div>
      <h1 className="text-4xl font-bold">Hello x!</h1>
      <p className="text-muted-foreground">Welcome to your new app.</p>
    </div>
  );
}\`} />`,
    ],
    // dev server terminal
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">terminal</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            <span className="text-primary">$</span> x dev{"\\n"}
            {"  [x] resolving routes..."}{"\\n"}
            {"  [x] found 3 routes in 12ms"}{"\\n"}
            {"  [x] dev server running at http://localhost:3000"}
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="terminal" lang="bash" code={\`x dev
  [x] resolving routes...
  [x] found 3 routes in 12ms
  [x] dev server running at http://localhost:3000\`} />`,
    ],
  ],

  "routing.tsx": [
    // routing table
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">routing table</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            {"pages/index.tsx         \\u2192 /"}{"\\n"}
            {"pages/about.tsx        \\u2192 /about"}{"\\n"}
            {"pages/contact.tsx      \\u2192 /contact"}{"\\n"}
            {"pages/blog/index.tsx   \\u2192 /blog"}{"\\n"}
            {"pages/blog/[slug].tsx  \\u2192 /blog/:slug"}{"\\n"}
            {"pages/dashboard/"}{"\\n"}
            {"  settings.tsx         \\u2192 /dashboard/settings"}{"\\n"}
            {"  profile.tsx          \\u2192 /dashboard/profile"}{"\\n"}
            {"pages/_404.tsx          \\u2192 catch-all 404"}
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="routing table" code={\`pages/index.tsx         -> /
pages/about.tsx        -> /about
pages/contact.tsx      -> /contact
pages/blog/index.tsx   -> /blog
pages/blog/[slug].tsx  -> /blog/:slug
pages/dashboard/
  settings.tsx         -> /dashboard/settings
  profile.tsx          -> /dashboard/profile
pages/_404.tsx          -> catch-all 404\`} />`,
    ],
    // static route
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">src/pages/about.tsx</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            {"export default function About() {"}{"\\n"}
            {"  return <h1 className=\\"text-3xl font-bold\\">About us</h1>;"}{"\\n"}
            {"}"}
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="src/pages/about.tsx" code={\`export default function About() {
  return <h1 className="text-3xl font-bold">About us</h1>;
}\`} />`,
    ],
    // dynamic segment
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">src/pages/blog/[slug].tsx</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            {"import type { RouteProps, LoaderArgs } from \\"@x/core\\";"}{"\\n"}{"\\n"}
            {"export async function loader({ params }: LoaderArgs) {"}{"\\n"}
            {"  const post = await getPost(params.slug);"}{"\\n"}
            {"  return { title: post.title, content: post.content };"}{"\\n"}
            {"}"}{"\\n"}{"\\n"}
            {"export default function BlogPost({ loaderData }: RouteProps<typeof loader>) {"}{"\\n"}
            {"  return ("}{"\\n"}
            {"    <article>"}{"\\n"}
            {"      <h1 className=\\"text-3xl font-bold\\">{loaderData.title}</h1>"}{"\\n"}
            {"      <div>{loaderData.content}</div>"}{"\\n"}
            {"    </article>"}{"\\n"}
            {"  );"}{"\\n"}
            {"}"}
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="src/pages/blog/[slug].tsx" code={\`import type { RouteProps, LoaderArgs } from "@x/core";

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
}\`} />`,
    ],
    // nested routes file tree
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">file tree</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            {"pages/dashboard/"}{"\\n"}
            {"  index.tsx           \\u2192 /dashboard"}{"\\n"}
            {"  settings.tsx        \\u2192 /dashboard/settings"}{"\\n"}
            {"  profile.tsx         \\u2192 /dashboard/profile"}{"\\n"}
            {"  billing/"}{"\\n"}
            {"    index.tsx         \\u2192 /dashboard/billing"}{"\\n"}
            {"    history.tsx       \\u2192 /dashboard/billing/history"}
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="file tree" lang="tree" code={\`pages/dashboard/
  index.tsx           -> /dashboard
  settings.tsx        -> /dashboard/settings
  profile.tsx         -> /dashboard/profile
  billing/
    index.tsx         -> /dashboard/billing
    history.tsx       -> /dashboard/billing/history\`} />`,
    ],
    // 404 page
    [
      `<div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/40" />
          <span className="ml-2 text-xs text-muted-foreground">src/pages/_404.tsx</span>
        </div>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
          <code className="font-mono text-muted-foreground">
            {"export default function NotFound() {"}{"\\n"}
            {"  return ("}{"\\n"}
            {"    <div className=\\"text-center py-20\\">"}{"\\n"}
            {"      <h1 className=\\"text-6xl font-bold text-muted-foreground\\">404</h1>"}{"\\n"}
            {"      <p className=\\"mt-4 text-lg text-muted-foreground\\">Page not found</p>"}{"\\n"}
            {"      <a href=\\"/\\" className=\\"mt-6 inline-block text-primary hover:underline\\">"}{"\\n"}
            {"        Go home"}{"\\n"}
            {"      </a>"}{"\\n"}
            {"    </div>"}{"\\n"}
            {"  );"}{"\\n"}
            {"}"}
          </code>
        </pre>
      </div>`,
      `<CodeBlock label="src/pages/_404.tsx" code={\`export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
      <a href="/" className="mt-6 inline-block text-primary hover:underline">
        Go home
      </a>
    </div>
  );
}\`} />`,
    ],
  ],
};

for (const file of files) {
  const filePath = join(docsDir, file);
  let content = readFileSync(filePath, "utf-8");
  const fileReplacements = replacements[file];
  if (!fileReplacements) continue;

  for (const [oldStr, newStr] of fileReplacements) {
    // Normalize both strings - remove extra indentation for matching
    const normalizedOld = oldStr.replace(/\n\s+/g, "\n").trim();
    const normalizedContent = content.replace(/\n\s+/g, "\n");
    const idx = normalizedContent.indexOf(normalizedOld);

    if (idx === -1) {
      console.log(`  MISSED in ${file}:`, normalizedOld.substring(0, 60));
      continue;
    }

    // Find the actual content by aligning line counts
    const oldLines = normalizedOld.split("\n").length;
    const contentLines = content.split("\n");
    let matchFound = false;

    // Try to find the actual match in original content
    for (let i = 0; i < contentLines.length; i++) {
      const startIdx = content.indexOf(
        oldStr.replace(/\n\s+/g, "\n").trim().split("\n")[0].trim(),
        i,
      );
      if (startIdx >= 0) {
        content = content.slice(0, startIdx) + newStr + content.slice(startIdx + oldStr.length);
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      console.log(`  FAILED in ${file}`);
    }
  }

  writeFileSync(filePath, content, "utf-8");
  console.log(`  Updated ${file}`);
}

console.log("Done!");
