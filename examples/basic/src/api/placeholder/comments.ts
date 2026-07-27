import { data } from "../../lib/placeholder-data";

export function GET(req: Request): Response {
  const url = new URL(req.url);
  const postId = url.searchParams.get("postId");
  if (postId) return Response.json(data.comments.filter((c) => c.postId === Number(postId)));

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const start = (page - 1) * limit;
  return Response.json({ total: data.comments.length, page, limit, data: data.comments.slice(start, start + limit) });
}
