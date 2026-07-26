import type { LoaderArgs, RouteProps } from "@x/core";
import { createElement } from "react";
import { getSession, parseSessionCookie } from "../../data/auth";

export async function loader({ request }: LoaderArgs) {
  const token = parseSessionCookie(request.headers.get("Cookie"));
  const session = getSession(token);
  if (!session) {
    return new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  return { username: session.username };
}

export default function DashboardPage({ loaderData }: RouteProps) {
  const username = (loaderData?.username as string) ?? "User";
  return createElement(
    "main",
    { style: { maxWidth: 640, margin: "4rem auto", fontFamily: "system-ui, sans-serif" } },
    createElement("h1", null, "Dashboard"),
    createElement("p", null, `Welcome, ${username}!`),
    createElement("hr", null),
    createElement("h2", null, "Server Functions Demo"),
    createElement(
      "button",
      {
        type: "button",
        "data-test-id": "greet-btn",
        onClick:
          "document.getElementById('greet-output').textContent = 'Loading...';fetch('/__x/actions/dashboard/greet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(['Dashboard User'])}).then(r=>r.json()).then(r=>document.getElementById('greet-output').textContent=r)",
        style: { padding: "0.5rem 1rem", marginRight: "0.5rem" },
      },
      "Greet",
    ),
    createElement("span", { id: "greet-output", style: { fontStyle: "italic" } }),
    createElement("hr", { style: { marginTop: "2rem" } }),
    createElement(
      "form",
      {
        "data-logout-form": "",
        onSubmit:
          "event.preventDefault();fetch('/api/auth/logout',{method:'POST'}).then(()=>window.location.href='/')",
        style: { marginTop: "1rem" },
      },
      createElement(
        "button",
        {
          type: "submit",
          style: {
            padding: "0.5rem 1rem",
            background: "#e00",
            color: "#fff",
            border: "none",
            borderRadius: 4,
          },
        },
        "Logout",
      ),
    ),
    createElement(
      "p",
      { style: { marginTop: "1rem" } },
      createElement("a", { href: "/" }, "Back home"),
    ),
  );
}
