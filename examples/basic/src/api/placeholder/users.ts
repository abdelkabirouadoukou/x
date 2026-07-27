import { data } from "../../lib/placeholder-data";

export function GET(req: Request): Response {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const user = data.users.find((u) => u.id === Number(id));
    if (!user) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(user);
  }
  return Response.json(data.users);
}
