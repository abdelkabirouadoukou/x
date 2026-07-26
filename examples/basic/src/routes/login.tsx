import type { RouteProps } from "@x/core";
import { createElement } from "react";

export default function LoginPage(_props: RouteProps) {
  return createElement(
    "main",
    { style: { maxWidth: 400, margin: "4rem auto", fontFamily: "system-ui, sans-serif" } },
    createElement("h1", null, "Login"),
    createElement(
      "form",
      {
        "data-login-form": "",
        onSubmit:
          "event.preventDefault();const f=event.target;fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:f.username.value,password:f.password.value})}).then(r=>r.ok?window.location.href='/dashboard':alert('Login failed'))",
        style: { display: "flex", flexDirection: "column", gap: "1rem" },
      },
      createElement(
        "label",
        null,
        "Username",
        createElement("input", {
          name: "username",
          defaultValue: "admin",
          style: { display: "block", width: "100%", padding: "0.5rem" },
        }),
      ),
      createElement(
        "label",
        null,
        "Password",
        createElement("input", {
          name: "password",
          type: "password",
          defaultValue: "admin",
          style: { display: "block", width: "100%", padding: "0.5rem" },
        }),
      ),
      createElement(
        "button",
        {
          type: "submit",
          style: {
            padding: "0.5rem",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 4,
          },
        },
        "Sign in",
      ),
    ),
    createElement(
      "p",
      { style: { marginTop: "1rem", fontSize: "0.875rem", color: "#666" } },
      "Demo credentials: admin / admin",
    ),
    createElement("p", null, createElement("a", { href: "/" }, "Back home")),
  );
}
