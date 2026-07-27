import { Mail, MapPin, Send } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Get in touch</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Have a question or want to learn more? We'd love to hear from you.
        </p>
      </div>

      <div className="mt-16 grid gap-12 sm:grid-cols-5">
        <div className="space-y-8 sm:col-span-2">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">Email</h3>
            <p className="mt-1 text-sm text-muted-foreground">hello@x-framework.dev</p>
          </div>
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">Location</h3>
            <p className="mt-1 text-sm text-muted-foreground">San Francisco, CA</p>
          </div>
        </div>

        <form className="space-y-5 sm:col-span-3" method="POST" action="/contact">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">Name</label>
              <input id="name" name="name" required className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
              <input id="email" name="email" type="email" required className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-2">Subject</label>
            <input id="subject" name="subject" required className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="How can we help?" />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">Message</label>
            <textarea id="message" name="message" rows={5} required className="w-full resize-none rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Tell us more..." />
          </div>
          <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90">
            Send message <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
