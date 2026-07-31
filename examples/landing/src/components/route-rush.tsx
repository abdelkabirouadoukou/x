"use client";

import { useMemo, useState } from "react";

interface Question {
  route: string;
  answer: string;
  decoys: string[];
}

const BANK: Question[] = [
  {
    route: "/about",
    answer: "pages/about.tsx",
    decoys: ["pages/about/index.tsx", "pages/[about].tsx", "api/about.ts"],
  },
  {
    route: "/blog/hello-world",
    answer: "pages/blog/[slug].tsx",
    decoys: ["pages/blog/hello-world.tsx", "pages/[blog]/slug.tsx", "pages/blog.tsx"],
  },
  {
    route: "/",
    answer: "pages/index.tsx",
    decoys: ["pages/home.tsx", "pages/root.tsx", "pages/_index.tsx"],
  },
  {
    route: "/docs/routing",
    answer: "pages/docs/routing.tsx",
    decoys: ["pages/docs/[routing].tsx", "pages/routing/docs.tsx", "api/docs/routing.ts"],
  },
  {
    route: "/products/42",
    answer: "pages/products/[id].tsx",
    decoys: ["pages/products/42.tsx", "pages/[products]/id.tsx", "pages/product-id.tsx"],
  },
  {
    route: "(unmatched path)",
    answer: "pages/_404.tsx",
    decoys: ["pages/404.tsx", "pages/error.tsx", "pages/_layout.tsx"],
  },
  {
    route: "GET /api/users",
    answer: "api/users.ts",
    decoys: ["pages/api/users.tsx", "pages/users.ts", "actions/users.ts"],
  },
  {
    route: "/docs/*  (every sub-page shares one shell)",
    answer: "pages/docs/_layout.tsx",
    decoys: ["pages/docs/index.tsx", "pages/_docs.tsx", "layouts/docs.tsx"],
  },
];

const ROUNDS = 6;

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

function buildRun(): { question: Question; choices: string[] }[] {
  return shuffle(BANK)
    .slice(0, ROUNDS)
    .map((question) => ({
      question,
      choices: shuffle([question.answer, ...question.decoys]),
    }));
}

export default function RouteRush() {
  const [run, setRun] = useState(() => buildRun());
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const done = round >= run.length;

  const current = run[round];

  function pick(choice: string) {
    if (picked || !current) return;
    setPicked(choice);
    if (choice === current.question.answer) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setRound((r) => r + 1);
  }

  function replay() {
    setRun(buildRun());
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
          <span className="h-2 w-2 rounded-full bg-primary" /> Route Rush
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {done ? run.length : round + 1}/{run.length} · score {score}
        </span>
      </div>

      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="p-5">
        {!done && current ? (
          <>
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Which file serves this route?
            </p>
            <p className="mt-1.5 break-words rounded-lg bg-accent px-3 py-2 font-mono text-sm font-medium text-accent-foreground">
              {current.question.route}
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {current.choices.map((choice) => {
                const isAnswer = choice === current.question.answer;
                const isPicked = choice === picked;
                const showState = picked !== null;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => pick(choice)}
                    disabled={picked !== null}
                    className={`rounded-lg border px-3 py-2 text-left font-mono text-[13px] transition-colors ${
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
                <p className="text-sm text-muted-foreground">
                  {picked === current.question.answer
                    ? "That's the one."
                    : `Correct file: ${current.question.answer}`}
                </p>
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
                ? "Every route resolved. You know the file tree cold."
                : "File tree is the route tree — give it another lap."}
            </p>
            <button
              type="button"
              onClick={replay}
              className="mt-4 inline-flex h-9 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
