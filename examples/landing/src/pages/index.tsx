import { Zap, Shield, BarChart3, Layers, Globe, Code2, ChevronDown, Check } from "lucide-react";

const features = [
  { icon: Zap, title: "Blazing Fast", description: "Built on Bun for instant startup and lightning-fast execution. No compilation step needed for development." },
  { icon: Shield, title: "Type Safe", description: "End-to-end type safety with TypeScript. Catch errors at compile time, not runtime." },
  { icon: BarChart3, title: "Built-in Analytics", description: "First-party analytics integration. Track page views, API calls, and performance metrics out of the box." },
  { icon: Layers, title: "SSR + Static", description: "Choose between server-side rendering and static generation per page. Hybrid mode supported." },
  { icon: Globe, title: "Edge Ready", description: "Deploy anywhere — Vercel, Cloudflare, or your own servers. Zero-config deployment." },
  { icon: Code2, title: "Developer Experience", description: "Hot module replacement, file-based routing, and intuitive APIs for maximum productivity." },
];

const testimonials = [
  { quote: "x framework completely changed how our team builds web apps. The developer experience is unmatched.", name: "Sarah Chen", role: "Lead Engineer", company: "TechCorp" },
  { quote: "We migrated our entire platform to x in two weeks. The performance improvements were immediate and significant.", name: "Marcus Johnson", role: "CTO", company: "StartupX" },
  { quote: "The simplicity of x combined with its power is what sold us. Our deployment pipeline has never been smoother.", name: "Emily Rodriguez", role: "VP of Engineering", company: "ScaleUp" },
];

const pricingPlans = [
  { name: "Starter", price: "Free", description: "Perfect for side projects and learning.", popular: false, cta: "Get Started", features: ["Up to 3 projects", "Static site generation", "Community support", "Basic analytics"] },
  { name: "Pro", price: "$29", period: "/mo", description: "For professional developers and teams.", popular: true, cta: "Start Free Trial", features: ["Unlimited projects", "SSR + Static hybrid", "Priority support", "Advanced analytics", "API routes", "Team collaboration"] },
  { name: "Enterprise", price: "Custom", description: "For large-scale applications.", popular: false, cta: "Contact Sales", features: ["Everything in Pro", "Dedicated support", "SLA guarantee", "Custom integrations", "On-premise deployment", "Audit logging"] },
];

const faqItems = [
  { q: "What is x framework?", a: "x is a modern fullstack framework built on Bun. It combines static site generation, server-side rendering, and API routes in a single, unified process with zero configuration." },
  { q: "How does x compare to Next.js?", a: "x is designed specifically for Bun, offering faster startup times, simpler configuration, and a more integrated development experience. It's ideal for teams that want to move fast without sacrificing quality." },
  { q: "Can I use x with my existing project?", a: "Yes! x can be gradually adopted. You can start with a single page or route and expand from there. We provide migration guides for Next.js, Remix, and other frameworks." },
  { q: "Is x production-ready?", a: "Absolutely. x is used in production by companies of all sizes. We follow semantic versioning and maintain a comprehensive changelog." },
  { q: "What hosting platforms does x support?", a: "x supports deployment to Vercel, Cloudflare Pages, Netlify, Docker, and any Node.js-compatible hosting environment with zero configuration." },
];

function AccordionItem({ q, a, index }: { q: string; a: string; index: number }) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer items-center justify-between py-5 text-sm font-medium hover:text-muted-foreground transition-colors [&::-webkit-details-marker]:hidden">
        {q}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</div>
    </details>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Build Faster. Scale Smarter.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-xl mx-auto">
              The modern fullstack framework for Bun. Static sites, SSR, APIs — one process.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <a href="/features" className="rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity shadow-lg">
                Get Started
              </a>
              <a href="/pricing" className="rounded-lg border border-border px-6 py-3 text-sm font-semibold hover:bg-accent transition-colors">
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need</h2>
            <p className="mt-4 text-muted-foreground">A complete toolkit for building modern web applications.</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Trusted by developers</h2>
            <p className="mt-4 text-muted-foreground">Hear from teams that ship with x.</p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-4 w-4 fill-primary" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-muted-foreground">Start free, scale as you grow.</p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3 items-start">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-8 transition-all duration-300 hover:shadow-lg ${plan.popular ? "border-primary shadow-md shadow-primary/10" : "border-border"}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/pricing"
                  className={`mt-8 flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border hover:bg-accent"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl">Frequently asked questions</h2>
            <p className="mt-4 text-muted-foreground text-center">Got questions? We have answers.</p>
            <div className="mt-12 divide-y divide-border rounded-xl border border-border px-6">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} index={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-primary/5 px-6 py-16 text-center shadow-lg sm:px-16">
            <div className="absolute top-0 right-0 -z-10 h-64 w-64 translate-x-1/4 -translate-y-1/4 rounded-full bg-primary/10 blur-3xl" />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to get started?</h2>
            <p className="mt-4 text-muted-foreground">Start building with x framework today.</p>
            <a
              href="/pricing"
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-foreground px-8 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity shadow-lg"
            >
              Get Started Now
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Acme. All rights reserved.
        </div>
      </footer>
    </>
  );
}
