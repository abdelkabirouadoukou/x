import type { RouteProps } from "@thexjs/core";

export default function PostPage({ params }: RouteProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Post: {params.id}</h1>
      <p>
        <a
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back home
        </a>
      </p>
    </div>
  );
}
