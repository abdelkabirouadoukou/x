import type { LoaderArgs, RouteProps } from "@x/core";
import Head from "../../components/Head";
import { Button } from "../../components/ui/button";
import { getSession, parseSessionCookie } from "../../lib/auth";

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

  return (
    <>
      <Head title={`Dashboard — ${username}`} description="User dashboard" />
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {username}!</p>
        <hr className="border-border" />
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Server Functions Demo</h2>
          <div className="flex items-center gap-3">
            <Button type="button" data-test-id="greet-btn" variant="outline">
              Greet
            </Button>
            <span id="greeting-result" className="italic text-muted-foreground" />
          </div>
        </div>
        <hr className="border-border" />
        <div className="flex items-center gap-3">
          <Button type="button" variant="destructive" id="logout-btn">
            Logout
          </Button>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back home
          </a>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  var greetBtn = document.querySelector('[data-test-id="greet-btn"]');
  var result = document.getElementById('greeting-result');
  if (greetBtn) {
    greetBtn.onclick = function() {
      result.textContent = 'Loading...';
      fetch('/__x/actions/dashboard/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(["Dashboard User"])
      }).then(function(r) {
        if (r.ok) return r.text();
        throw new Error('Request failed');
      }).then(function(text) {
        result.textContent = text;
      }).catch(function() {
        result.textContent = 'Error';
      });
    };
  }
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      fetch('/api/auth/logout', { method: 'POST' }).then(function() {
        window.location.href = '/';
      });
    };
  }
})();
          `.trim(),
        }}
      />
    </>
  );
}
