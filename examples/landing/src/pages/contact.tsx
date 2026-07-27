import { ArrowLeft, Mail, MapPin, Twitter, Github } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
      <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </a>

      <div className="mx-auto max-w-2xl text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
          Get in touch
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Have a question or want to learn more? We'd love to hear from you.
        </p>
      </div>

      <div className="grid gap-16 lg:grid-cols-2">
        <div>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium">Subject</label>
              <input
                id="subject"
                type="text"
                placeholder="How can we help?"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">Message</label>
              <textarea
                id="message"
                rows={5}
                placeholder="Tell us more about your project..."
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-y"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-foreground px-8 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity shadow-lg"
            >
              Send Message
            </button>
          </form>
        </div>

        <div className="space-y-10 lg:pt-2">
          <div>
            <h2 className="text-lg font-semibold mb-6">Contact information</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a href="mailto:hello@acme.dev" className="text-sm text-muted-foreground hover:text-foreground transition-colors">hello@acme.dev</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">548 Market St, San Francisco, CA 94104</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-6">Follow us</h2>
            <div className="flex gap-4">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold mb-2">Response time</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We typically respond within 24 hours on business days. For urgent inquiries, please reach out via our community Discord.
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-32 border-t border-border pt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Acme. All rights reserved.
      </footer>
    </div>
  );
}
