"use client";

import { useMemo, useState } from "react";

/**
 * Boarding Pass
 *
 * A small, pointless-in-a-good-way souvenir: type your name and the route
 * you're building (a path pattern, same syntax RouteResolver teaches
 * elsewhere on the page), and get a printed-ticket rendering of it — gate,
 * seat, and a real EAN-ish barcode built from nothing but your input.
 *
 * Why this instead of another framework demo: everything else on the page
 * demonstrates x. This just makes the visitor a small artifact of their own,
 * which is the kind of thing a person adds to a project for fun, not
 * something a spec would ask for.
 */

const GATES = ["A", "B", "C", "D", "E", "F"];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function normalizeRoute(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

function deriveTicket(name: string, route: string) {
  const seed = hashString(`${name}::${route}`);
  const gate = GATES[seed % GATES.length];
  const gateNumber = 1 + (seed % 24);
  const seatRow = 1 + ((seed >>> 3) % 34);
  const seatLetter = "ABCDEF"[(seed >>> 7) % 6];
  const boarding = `${String(6 + ((seed >>> 5) % 12)).padStart(2, "0")}:${String(
    ((seed >>> 9) % 6) * 10,
  ).padStart(2, "0")}`;
  const segCount = route === "/" ? 1 : route.split("/").filter(Boolean).length;
  const isDynamic = /[:[]/.test(route);

  // A stable "barcode": bar widths derived from the hash, not decorative.
  const bars = Array.from({ length: 34 }, (_, i) => {
    const v = (seed >>> (i % 24)) ^ (i * 2654435761);
    return { id: `bar-${i}-${1 + (Math.abs(v) % 3)}`, width: 1 + (Math.abs(v) % 3) };
  });

  return {
    gate: `${gate}${gateNumber}`,
    seat: `${seatRow}${seatLetter}`,
    boarding,
    segCount,
    isDynamic,
    bars,
    confirmation: seed.toString(36).toUpperCase().slice(0, 6).padStart(6, "0"),
  };
}

export default function BoardingPass() {
  const [name, setName] = useState("");
  const [routeInput, setRouteInput] = useState("blog/[slug]");
  const [issued, setIssued] = useState(false);

  const route = useMemo(() => normalizeRoute(routeInput), [routeInput]);
  const passenger = name.trim() || "YOUR NAME";
  const ticket = useMemo(() => deriveTicket(passenger, route), [passenger, route]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Passenger
          </span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setIssued(false);
            }}
            placeholder="Abdo"
            maxLength={24}
            className="h-10 w-full rounded-xl border border-input bg-background/70 px-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Route
          </span>
          <input
            value={routeInput}
            onChange={(e) => {
              setRouteInput(e.target.value);
              setIssued(false);
            }}
            placeholder="blog/[slug]"
            maxLength={40}
            className="h-10 w-full rounded-xl border border-input bg-background/70 px-3 font-mono text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          type="button"
          onClick={() => setIssued(true)}
          className="aqua-btn h-10 self-end px-5 text-sm font-semibold"
        >
          Print pass
        </button>
      </div>

      <div className="ticket-card glass relative mt-6 flex overflow-hidden rounded-2xl">
        <div className="min-w-0 flex-1 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                x airways · one process, one runtime
              </p>
              <h3 className="mt-1.5 truncate font-display text-2xl font-normal uppercase tracking-tight">
                {passenger}
              </h3>
            </div>
            {issued && (
              <span className="rubber-stamp shrink-0 rounded-md border-2 border-secondary px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Confirmed
              </span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Route
              </p>
              <p className="lcd mt-1 truncate text-lg">{route}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Render
              </p>
              <p className="lcd mt-1 text-lg">{ticket.isDynamic ? "SSR" : "STATIC"}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Gate
              </p>
              <p className="lcd mt-1 text-lg">{ticket.gate}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Seat
              </p>
              <p className="lcd mt-1 text-lg">{ticket.seat}</p>
            </div>
          </div>

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Boarding {ticket.boarding} · {ticket.segCount} segment
            {ticket.segCount === 1 ? "" : "s"} · conf. {ticket.confirmation}
          </p>
        </div>

        <div className="ticket-card-perf hidden sm:block" aria-hidden="true" />

        <div className="flex w-28 shrink-0 flex-col items-center justify-center gap-3 p-4">
          <p className="rotate-180 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground [writing-mode:vertical-rl]">
            {ticket.gate} · {ticket.seat}
          </p>
          <div className="barcode-bars">
            {ticket.bars.map((bar) => (
              <span key={bar.id} style={{ width: `${bar.width}px` }} />
            ))}
          </div>
          <p className="font-mono text-[9px] text-muted-foreground">{ticket.confirmation}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Every field except the name and route is derived. Same input, same ticket, every time.
      </p>
    </div>
  );
}
