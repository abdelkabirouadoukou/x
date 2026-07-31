"use client";

import { Gamepad2, MapPin, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fireShootingStar } from "./easter-egg";

interface Cmd {
  label: string;
  hint: string;
  href?: string;
  action?: () => void;
  icon: typeof Search;
}

const NAV_COMMANDS: Cmd[] = [
  { label: "Home", hint: "/", href: "/", icon: MapPin },
  { label: "Introduction", hint: "/docs/introduction", href: "/docs/introduction", icon: MapPin },
  { label: "Installation", hint: "/docs/installation", href: "/docs/installation", icon: MapPin },
  {
    label: "Getting Started",
    hint: "/docs/getting-started",
    href: "/docs/getting-started",
    icon: MapPin,
  },
  { label: "Routing", hint: "/docs/routing", href: "/docs/routing", icon: MapPin },
  { label: "Pages & Loaders", hint: "/docs/pages", href: "/docs/pages", icon: MapPin },
  { label: "Layouts", hint: "/docs/layouts", href: "/docs/layouts", icon: MapPin },
  { label: "API Routes", hint: "/docs/api-routes", href: "/docs/api-routes", icon: MapPin },
  {
    label: "Server Functions",
    hint: "/docs/server-functions",
    href: "/docs/server-functions",
    icon: MapPin,
  },
  {
    label: "Client Navigation",
    hint: "/docs/client-navigation",
    href: "/docs/client-navigation",
    icon: MapPin,
  },
  {
    label: "Content Collections",
    hint: "/docs/content-collections",
    href: "/docs/content-collections",
    icon: MapPin,
  },
  { label: "Middleware", hint: "/docs/middleware", href: "/docs/middleware", icon: MapPin },
  { label: "Data Layer", hint: "/docs/data-layer", href: "/docs/data-layer", icon: MapPin },
  { label: "Build & Deploy", hint: "/docs/build-deploy", href: "/docs/build-deploy", icon: MapPin },
  {
    label: "Configuration",
    hint: "/docs/configuration",
    href: "/docs/configuration",
    icon: MapPin,
  },
  { label: "Security", hint: "/docs/security", href: "/docs/security", icon: MapPin },
  {
    label: "Observability",
    hint: "/docs/observability",
    href: "/docs/observability",
    icon: MapPin,
  },
  { label: "@thexjs/core", hint: "/docs/packages/core", href: "/docs/packages/core", icon: MapPin },
  { label: "@thexjs/cli", hint: "/docs/packages/cli", href: "/docs/packages/cli", icon: MapPin },
  { label: "@thexjs/env", hint: "/docs/packages/env", href: "/docs/packages/env", icon: MapPin },
  {
    label: "@thexjs/adapter-vercel",
    hint: "/docs/packages/adapter-vercel",
    href: "/docs/packages/adapter-vercel",
    icon: MapPin,
  },
  { label: "Features", hint: "/features", href: "/features", icon: MapPin },
  { label: "The x Arcade", hint: "/play — three tiny games", href: "/play", icon: Gamepad2 },
  {
    label: "GitHub",
    hint: "opens in a new tab",
    href: "https://github.com/abdelkabirouadoukou/x",
    icon: MapPin,
  },
];

const FUN_COMMANDS: Cmd[] = [
  {
    label: "Shooting star",
    hint: "you can also just mash the Konami code",
    icon: Sparkles,
    action: () => fireShootingStar(),
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      if (isK) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const all = [...FUN_COMMANDS, ...NAV_COMMANDS];
    if (!query.trim()) return all.slice(0, 9);
    const q = query.toLowerCase();
    return all
      .filter((c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q))
      .slice(0, 9);
  }, [query]);

  function run(cmd: Cmd) {
    setOpen(false);
    if (cmd.action) {
      cmd.action();
      return;
    }
    if (cmd.href) {
      if (cmd.href.startsWith("http")) window.open(cmd.href, "_blank", "noopener,noreferrer");
      else window.location.href = cmd.href;
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 px-4 pt-[14vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActive((a) => Math.min(a + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === "Enter" && results[active]) {
          run(results[active]);
        }
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Jump to a page, or type a command…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing matches "{query}"
            </p>
          )}
          {results.map((cmd, i) => (
            <button
              key={cmd.label}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => run(cmd)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                i === active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <cmd.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="flex-1">{cmd.label}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{cmd.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Small header/footer trigger so the palette is discoverable without knowing the shortcut. */
export function CommandPaletteTrigger({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        // Opening the palette is implemented as a synthetic `keydown` on
        // `window` (the CommandPalette island listens for real ⌘K there), which
        // updates a *different* React root. Dispatching it synchronously while
        // React is still dispatching this click leaves React's event system in
        // a re-entrant state and can crash it (getEventTarget with an undefined
        // nativeEvent). Defer to the next task so this click dispatch finishes
        // first.
        setTimeout(() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
        }, 0);
      }}
      className={`inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground ${className}`}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded border border-border bg-muted px-1 font-mono text-[10px] sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
