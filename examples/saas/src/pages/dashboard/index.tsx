import { Users, DollarSign, Activity, TrendingUp } from "lucide-react";
import type { LoaderArgs, RouteProps } from "@x/core";

export async function loader({ request }: LoaderArgs) {
  const { parseSessionCookie, getSession } = await import("../../lib/auth");
  const token = parseSessionCookie(request.headers.get("Cookie"));
  const session = getSession(token);
  return { username: session?.username ?? "User" };
}

const stats = [
  { label: "Total Users", value: "24,563", change: "+12.5%", icon: Users, trend: "up" },
  { label: "Revenue", value: "$48,290", change: "+8.2%", icon: DollarSign, trend: "up" },
  { label: "Active Now", value: "1,429", change: "+3.1%", icon: Activity, trend: "up" },
  { label: "Growth", value: "23.4%", change: "+2.4%", icon: TrendingUp, trend: "up" },
];

const recentActivity = [
  { user: "Sarah Chen", action: "created a new project", time: "2 minutes ago" },
  { user: "Mike Johnson", action: "upgraded to Pro plan", time: "15 minutes ago" },
  { user: "Emily Davis", action: "invited 3 team members", time: "1 hour ago" },
  { user: "Alex Kim", action: "completed onboarding", time: "3 hours ago" },
  { user: "Lisa Park", action: "exported analytics report", time: "5 hours ago" },
];

export default function DashboardPage({ loaderData }: RouteProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, {loaderData?.username as string}!</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-card-foreground">{stat.value}</p>
              <p className="mt-1 text-sm text-emerald-400">{stat.change} this month</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-card-foreground">Recent Activity</h3>
        </div>
        <div className="divide-y divide-border">
          {recentActivity.map((item) => (
            <div key={item.user + item.time} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {item.user.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-card-foreground">
                    <span className="font-medium">{item.user}</span> {item.action}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
