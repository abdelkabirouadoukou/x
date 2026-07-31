"use client";

import { useMemo, useState } from "react";

interface Scenario {
  desc: string;
  answer: "static" | "server";
  why: string;
}

const BANK: Scenario[] = [
  {
    desc: "Marketing homepage — same for every visitor, changes maybe once a month.",
    answer: "static",
    why: "No per-request data. Prerender it once at build time.",
  },
  {
    desc: "A logged-in dashboard showing the current user's account balance.",
    answer: "server",
    why: "Needs a loader that runs per request, scoped to the signed-in user.",
  },
  {
    desc: "A blog post rendered from a markdown file in the repo.",
    answer: "static",
    why: "Content lives in the repo at build time — no reason to hit a loader per request.",
  },
  {
    desc: "A live sports score page that must reflect the current score on load.",
    answer: "server",
    why: "The data changes constantly and has to be fresh on every request.",
  },
  {
    desc: "Pricing page with three fixed tiers, no personalization.",
    answer: "static",
    why: "Nothing here depends on who's asking — ship the same HTML to everyone.",
  },
  {
    desc: "A page that reads a `?ref=` query param and shows a personalized banner.",
    answer: "server",
    why: "The output depends on the incoming request, so it can't be baked at build time.",
  },
];

const ROUNDS = 5;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const ai = a[i];
    const aj = a[j];
    if (ai === undefined || aj === undefined) continue;
    a[i] = aj;
    a[j] = ai;
  }
  return a;
}

export default function ModeCall() {
  const [run, setRun] = useState(() => shuffle(BANK).slice(0, ROUNDS));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<"static" | "server" | null>(null);
  const done = round >= run.length;
  const current = run[round];

  function pick(choice: "static" | "server") {
    if (picked || !current) return;
    setPicked(choice);
    if (choice === current.answer) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setRound((r) => r + 1);
  }

  function replay() {
    setRun(shuffle(BANK).slice(0, ROUNDS));
    setRound(0);
    setScore(0);
    setPicked(null);
  }

  const progressPct = useMemo(
    () => Math.round(((done ? run.length : round) / run.length) * 100),
    [round, done, run.length],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-2.5">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-accent-foreground" /> Mode Call
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {done ? run.length : round + 1}/{run.length} · score {score}
        </span>
      </div>
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-accent-foreground transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="p-5">
        {!done && current ? (
          <>
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              static or server?
            </p>
            <p className="mt-1.5 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground">
              {current.desc}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["static", "server"] as const).map((choice) => {
                const isAnswer = choice === current.answer;
                const isPicked = choice === picked;
                const showState = picked !== null;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => pick(choice)}
                    disabled={picked !== null}
                    className={`rounded-lg border px-3 py-3 text-center font-mono text-sm font-medium transition-colors ${
                      showState && isAnswer
                        ? "border-primary bg-primary/10 text-primary"
                        : showState && isPicked
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                    }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {picked && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{current.why}</p>
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex h-8 shrink-0 items-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {round + 1 < run.length ? "Next" : "See score"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-2 text-center">
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Run complete
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-foreground">
              {score} / {run.length}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {score === run.length
                ? "Every call was right. You know exactly when to reach for a loader."
                : "Rendering mode is a request-time question — give it another pass."}
            </p>
            <button
              type="button"
              onClick={replay}
              className="stamp-press mt-4 inline-flex h-9 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
