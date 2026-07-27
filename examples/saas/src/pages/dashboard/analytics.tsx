import type { LoaderArgs, RouteProps } from "@x/core";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";

export async function loader({ request }: LoaderArgs) {
  const { parseSessionCookie, getSession } = await import("../../lib/auth");
  const token = parseSessionCookie(request.headers.get("Cookie"));
  const session = getSession(token);
  return { username: session?.username ?? "User" };
}

const charts = [
  { icon: BarChart3, title: "Monthly Revenue", colors: "from-blue-500/20 to-purple-500/20" },
  { icon: TrendingUp, title: "User Growth", colors: "from-emerald-500/20 to-teal-500/20" },
  { icon: PieChart, title: "Traffic Sources", colors: "from-orange-500/20 to-pink-500/20" },
];

export default function AnalyticsPage({ loaderData }: RouteProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track your performance metrics</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {charts.map((chart) => {
          const Icon = chart.icon;
          return (
            <div
              key={chart.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground">{chart.title}</h3>
              </div>
              <div
                className={`mt-6 flex h-48 items-center justify-center rounded-xl bg-gradient-to-br ${chart.colors} border border-border/50`}
              >
                <p className="text-sm text-muted-foreground">Chart placeholder</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Summary</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Page Views</p>
            <p className="mt-1 text-2xl font-bold text-foreground">1,234,567</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="mt-1 text-2xl font-bold text-foreground">3.42%</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Avg. Session</p>
            <p className="mt-1 text-2xl font-bold text-foreground">4m 32s</p>
          </div>
        </div>
      </div>
    </div>
  );
}
