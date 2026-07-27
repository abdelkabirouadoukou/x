import { data } from "../../lib/placeholder-data";

export function GET(req: Request): Response {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const post = data.posts.find((p) => p.id === Number(id));
    if (!post) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(post);
  }
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const start = (page - 1) * limit;
  return Response.json({
    total: data.posts.length,
    page,
    limit,
    data: data.posts.slice(start, start + limit),
  });
}
