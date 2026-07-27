import { Check, X, ArrowLeft, ChevronDown } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: null,
    description: "Perfect for side projects and learning the framework.",
    popular: false,
    cta: "Get Started",
    features: ["Up to 3 projects", "Static site generation", "Community support", "Basic analytics", "1 API route", "500 requests/day"],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For professional developers and growing teams.",
    popular: true,
    cta: "Start Free Trial",
    features: ["Unlimited projects", "SSR + Static hybrid", "Priority support", "Advanced analytics", "Unlimited API routes", "10,000 requests/day", "Team collaboration", "Custom domains", "Preview deployments"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: null,
    description: "For large-scale applications with custom requirements.",
    popular: false,
    cta: "Contact Sales",
    features: ["Everything in Pro", "Dedicated support engineer", "SLA guarantee (99.99%)", "Custom integrations", "On-premise deployment", "Unlimited requests", "Audit logging", "SSO/SAML", "Custom contract terms"],
  },
];

const allFeatureNames = [
  "Static site generation",
  "Server-side rendering",
  "API routes",
  "Analytics",
  "Team collaboration",
  "Custom domains",
  "Preview deployments",
  "Priority support",
  "Dedicated support",
  "SLA guarantee",
  "On-premise deployment",
  "SSO/SAML",
];

const planFeaturesMap: Record<string, string[]> = {
  Starter: ["Static site generation", "API routes", "Analytics"],
  Pro: ["Static site generation", "Server-side rendering", "API routes", "Analytics", "Team collaboration", "Custom domains", "Preview deployments", "Priority support"],
  Enterprise: allFeatureNames,
};

const pricingFaq = [
  { q: "Can I upgrade from Starter to Pro?", a: "Yes, you can upgrade at any time. Your projects and data will be preserved, and you'll get immediate access to Pro features." },
  { q: "Is there a free trial for Pro?", a: "Yes, we offer a 14-day free trial of the Pro plan with no credit card required." },
  { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and wire transfers for annual Enterprise plans." },
  { q: "Can I cancel anytime?", a: "Absolutely. You can cancel your subscription at any time. You'll retain access to paid features until the end of your billing period." },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer items-center justify-between py-4 text-sm font-medium hover:text-muted-foreground transition-colors [&::-webkit-details-marker]:hidden">
        {q}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</div>
    </details>
  );
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
      <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </a>

      <div className="mx-auto max-w-2xl text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">Start free, scale as you grow. No hidden fees.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 items-start mb-24">
        {plans.map((plan) => (
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
              href="/contact"
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

      <section className="mb-24">
        <h2 className="text-2xl font-bold tracking-tight text-center mb-12">Feature comparison</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="px-6 py-4 text-left font-semibold">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.name} className={`px-6 py-4 text-center font-semibold ${plan.popular ? "text-primary" : ""}`}>
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatureNames.map((feature) => (
                <tr key={feature} className="border-b border-border last:border-0 hover:bg-card/50 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground">{feature}</td>
                  {plans.map((plan) => {
                    const has = planFeaturesMap[plan.name]!.includes(feature);
                    return (
                      <td key={plan.name} className="px-6 py-4 text-center">
                        {has ? <Check className="h-4 w-4 mx-auto text-primary" /> : <X className="h-4 w-4 mx-auto text-muted-foreground/40" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">Pricing FAQ</h2>
          <p className="text-muted-foreground text-center mb-10">Have more questions? <a href="/contact" className="underline hover:text-foreground transition-colors">Contact us</a>.</p>
          <div className="divide-y divide-border rounded-xl border border-border px-6">
            {pricingFaq.map((item, i) => (
              <AccordionItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-32 border-t border-border pt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Acme. All rights reserved.
      </footer>
    </div>
  );
}
