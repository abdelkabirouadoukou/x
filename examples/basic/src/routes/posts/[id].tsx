import type { RouteProps } from "@x/core";

export default function PostPage({ params }: RouteProps) {
  return (
    <main>
      <h1>Post: {params.id}</h1>
      <p>
        <a href="/">Back home</a>
      </p>
    </main>
  );
}
