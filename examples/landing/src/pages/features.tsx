import { Zap, Shield, BarChart3, Layers, Globe, Code2, ArrowLeft } from "lucide-react";

const featureDetails = [
  {
    icon: Zap,
    title: "Blazing Fast Performance",
    description: "Built from the ground up on Bun, x delivers instant startup times and incredibly fast execution. No build step required during development — just save and refresh.",
    benefits: ["Sub-millisecond cold starts", "Instant hot module replacement", "Optimized production builds with tree-shaking", "Automatic code splitting"],
    gradient: "from-orange-500/20 to-amber-500/5",
  },
  {
    icon: Shield,
    title: "End-to-End Type Safety",
    description: "TypeScript is a first-class citizen. Share types between your frontend and backend effortlessly, catching issues before they reach production.",
    benefits: ["Shared type definitions across client and server", "Automatic API type generation", "Runtime type validation with Zod integration", "Eliminate entire categories of bugs"],
    gradient: "from-blue-500/20 to-cyan-500/5",
  },
  {
    icon: BarChart3,
    title: "Built-in Analytics",
    description: "Understand your application with first-party analytics. Track page views, API performance, user behavior, and more without third-party tools.",
    benefits: ["Privacy-first analytics without cookie banners", "Real-time performance monitoring", "Custom event tracking API", "Beautiful dashboard out of the box"],
    gradient: "from-green-500/20 to-emerald-500/5",
  },
  {
    icon: Layers,
    title: "SSR + Static Generation",
    description: "The best of both worlds. Choose server-side rendering for dynamic content and static generation for marketing pages — all in the same project.",
    benefits: ["Per-page rendering strategy", "Incremental static regeneration", "Streaming SSR for faster page loads", "Automatic static optimization"],
    gradient: "from-purple-500/20 to-violet-500/5",
  },
  {
    icon: Globe,
    title: "Edge-Ready Deployment",
    description: "Deploy anywhere with zero configuration. Whether you prefer Vercel, Cloudflare, or your own infrastructure, x adapts seamlessly.",
    benefits: ["Deploy to any Node.js or Bun runtime", "Built-in adapter system", "Automatic SSL and CDN", "Preview deployments for every branch"],
    gradient: "from-pink-500/20 to-rose-500/5",
  },
  {
    icon: Code2,
    title: "Exceptional Developer Experience",
    description: "File-based routing, intuitive APIs, comprehensive documentation — everything you need to be productive from day one.",
    benefits: ["Intuitive file-based routing", "Built-in API routes with middleware", "Comprehensive CLI tools", "Rich plugin ecosystem"],
    gradient: "from-indigo-500/20 to-blue-500/5",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
      <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </a>

      <div className="mx-auto max-w-2xl text-center mb-20">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
          Everything you need to build modern web apps
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          x combines the best developer experience with production-ready performance.
        </p>
      </div>

      <div className="space-y-24">
        {featureDetails.map((feature, i) => {
          const Icon = feature.icon;
          const isReversed = i % 2 === 1;
          return (
            <div
              key={feature.title}
              className={`flex flex-col ${isReversed ? "lg:flex-row-reverse" : "lg:flex-row"} gap-12 items-center`}
            >
              <div className={`flex-1 rounded-2xl bg-gradient-to-br ${feature.gradient} p-16 flex items-center justify-center min-h-[320px] border border-border/50`}>
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-card shadow-lg">
                  <Icon className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div className="flex-1 space-y-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{feature.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                <ul className="space-y-3 pt-2">
                  {feature.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-sm">
                      <svg className="h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="mt-32 border-t border-border pt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Acme. All rights reserved.
      </footer>
    </div>
  );
}
