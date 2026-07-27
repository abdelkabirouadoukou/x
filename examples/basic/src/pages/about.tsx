export const mode = "static";

export default function AboutPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">About</h1>
      <p className="text-muted-foreground">
        This page is marked as <code className="bg-muted px-1.5 py-0.5 rounded text-sm">static</code> and prerendered at build time.
      </p>
      <p>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back home</a>
      </p>
    </div>
  );
}
