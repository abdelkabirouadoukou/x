export const mode = "server";
export async function loader() {
  return { items: Array.from({ length: 10 }, (_, i) => ({ id: i, name: "item" + i })) };
}
export default function About({ loaderData }: { loaderData: { items: Array<{ id: number; name: string }> } }) {
  return (
    <main>
      <h1>About</h1>
      <ul>{loaderData.items.map((it) => <li key={it.id}>{it.name}</li>)}</ul>
    </main>
  );
}
