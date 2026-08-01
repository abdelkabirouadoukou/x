import { Island } from "@thexjs/core";
import { BookOpen, FileJson, ShieldCheck, Split, Ticket } from "lucide-react";
import BoardingPass from "../components/boarding-pass";
import LeakCheck from "../components/leak-check";
import ModeCall from "../components/mode-call";
import RouteRush from "../components/route-rush";

export const mode = "static";
export const islands = { RouteRush, LeakCheck, ModeCall, BoardingPass };

const games = [
  {
    icon: FileJson,
    title: "Route Rush",
    tagline: "File-based routing, under time pressure",
    body: "Six routes, six file trees. Pick the file that would actually serve each one.",
    node: (
      <Island name="RouteRush" client="visible">
        <RouteRush />
      </Island>
    ),
  },
  {
    icon: ShieldCheck,
    title: "Leak Check",
    tagline: "The env-isolation feature, as a reflex game",
    body: "Only THEXJS_PUBLIC_-prefixed vars are safe for the browser. Everything else needs to stay server-side — same rule the build-time leak scanner enforces for real.",
    node: (
      <Island name="LeakCheck" client="visible">
        <LeakCheck />
      </Island>
    ),
  },
  {
    icon: Split,
    title: "Mode Call",
    tagline: "static vs. server, scenario by scenario",
    body: "Read the page description, call the rendering mode. The reasoning is more useful than the score.",
    node: (
      <Island name="ModeCall" client="visible">
        <ModeCall />
      </Island>
    ),
  },
];

export default function PlayPage() {
  return (
    <div className="route-grid px-6 pb-32 pt-16 sm:pt-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Learn by playing
        </p>
        <h1 className="mt-4 text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          The x Arcade
        </h1>
        <p className="mt-4 text-muted-foreground">
          Three small games built out of the same ideas the framework runs on, plus one souvenir.
          None of them take more than a minute — play one, or all four.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-xl space-y-16">
        {games.map((g) => (
          <section key={g.title}>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary">
                <g.icon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold uppercase tracking-tight">
                  {g.title}
                </h2>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {g.tagline}
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{g.body}</p>
            {g.node}
          </section>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-2xl">
        <section>
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary">
              <Ticket className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-tight">
                Boarding Pass
              </h2>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                a route, printed as a ticket
              </p>
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Not a game — a souvenir. Type a route the way you'd name a file under{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
              src/pages
            </code>
            , and get it back as a boarding pass: gate, seat, static-vs-SSR, all derived from what
            you typed.
          </p>
          <Island name="BoardingPass" client="visible">
            <BoardingPass />
          </Island>
        </section>
      </div>

      <div className="mx-auto mt-20 max-w-xl text-center">
        <a
          href="/docs"
          className="stamp-press inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <BookOpen className="h-4 w-4" /> Prefer to read? Go to the docs
        </a>
      </div>
    </div>
  );
}
