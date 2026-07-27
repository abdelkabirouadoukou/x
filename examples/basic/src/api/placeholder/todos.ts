import { data } from "../../lib/placeholder-data";

export function GET(req: Request): Response {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  let items = data.todos;
  if (userId) items = items.filter((t) => t.userId === Number(userId));
  const completedParam = url.searchParams.get("completed");
  if (completedParam !== null)
    items = items.filter((t) => t.completed === (completedParam === "true"));

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const start = (page - 1) * limit;
  return Response.json({
    total: items.length,
    page,
    limit,
    data: items.slice(start, start + limit),
  });
}
