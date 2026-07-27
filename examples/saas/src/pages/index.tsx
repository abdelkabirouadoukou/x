import { ArrowRight, BarChart3, Globe, Lock, Shield, Users, Zap } from "lucide-react";
import { cn } from "../lib/utils";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Blazing performance with edge-ready infrastructure.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and compliance built-in.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time insights with customizable dashboards.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Work together seamlessly in real-time.",
  },
  { icon: Globe, title: "Global Scale", description: "Deploy to 30+ regions worldwide." },
  { icon: Lock, title: "Access Control", description: "Granular permissions and SSO integration." },
];

export default function HomePage() {
  return (
    <div className="bg-background">
      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="bg-gradient-to-r from-foreground via-primary to-chart-1 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl lg:text-7xl">
            Your All-in-One Platform
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Build, deploy, and scale your SaaS application with modern tools, real-time analytics,
            and enterprise-grade security.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
            >
              Sign In
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features to help you scale your business.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of teams already building with SaaS.
          </p>
          <a
            href="/pricing"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
          >
            Start your free trial
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>
    </div>
  );
}
