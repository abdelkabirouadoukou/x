import { User, Bell, AlertTriangle, Save } from "lucide-react";
import type { LoaderArgs, RouteProps } from "@x/core";

export async function loader({ request }: LoaderArgs) {
  const { parseSessionCookie, getSession } = await import("../../lib/auth");
  const token = parseSessionCookie(request.headers.get("Cookie"));
  const session = getSession(token);
  return { username: session?.username ?? "User" };
}

export default function SettingsPage({ loaderData }: RouteProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground">Profile</h3>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-card-foreground mb-1.5">Name</label>
              <input
                id="name"
                defaultValue={loaderData?.username as string}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div>
              <label htmlFor="settings-email" className="block text-sm font-medium text-card-foreground mb-1.5">Email</label>
              <input
                id="settings-email"
                type="email"
                defaultValue="john@example.com"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground">Notifications</h3>
        </div>
        <div className="space-y-4 p-6">
          {["Email notifications", "Push notifications", "Weekly digest", "Product updates"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
              <span className="text-sm text-card-foreground">{item}</span>
              <div className="flex h-6 w-11 cursor-pointer items-center rounded-full bg-primary p-0.5 transition-colors">
                <div className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform translate-x-[1.25rem]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-destructive/30 bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground">Danger Zone</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data.</p>
          <button className="rounded-xl border border-destructive/50 bg-destructive/10 px-5 py-2.5 text-sm font-semibold text-destructive transition-all hover:bg-destructive/20">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
