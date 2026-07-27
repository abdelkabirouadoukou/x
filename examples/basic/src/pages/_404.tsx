import type { RouteProps } from "@x/core";
import Link from "../components/Link";

export default function CustomNotFound(_props: RouteProps) {
  return (
    <div className="text-center py-16">
      <h1 className="text-6xl font-extrabold text-primary mb-2">404</h1>
      <p className="text-lg mb-8 text-muted-foreground">This page doesn't exist.</p>
      <Link href="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Back to home</Link>
    </div>
  );
}
