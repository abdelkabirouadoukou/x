import { ArrowRight, CornerDownLeft, FileText, Search, X } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Block {
  kind: "h1" | "h2" | "h3" | "p" | "li" | "pre";
  text: string;
  anchor: string;
}

interface PageEntry {
  route: string;
  title: string;
  blocks: Block[];
}

interface IndexData {
  version: number;
  pages: PageEntry[];
}

interface Hit {
  route: string;
  title: string;
  heading: string;
  anchor: string;
  snippet: string;
  score: number;
}

const MAX_RESULTS = 12;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9_@./-]+/g, " ");
}

function tokens(q: string): string[] {
  return normalize(q).split(/\s+/).filter(Boolean);
}

/** Score one page against the query; returns the best block match. */
function scorePage(page: PageEntry, q: string, toks: string[]): Hit | null {
  let titleMatch = false;
  let headingScore = 0;
  let bodyScore = 0;
  let best: { heading: string; anchor: string; snippet: string; score: number } | null = null;
  let currentHeading = "";
  let currentAnchor = "";

  const qNorm = normalize(q);
  if (page.title && normalize(page.title).includes(qNorm)) titleMatch = true;

  for (const b of page.blocks) {
    if (b.kind === "h2" || b.kind === "h3") {
      currentHeading = b.text;
      currentAnchor = b.anchor;
    }
    const n = normalize(b.text);
    if (!n) continue;
    let score = 0;
    for (const t of toks) if (n.includes(t)) score += 1;
    if (score === 0) continue;

    const isHeading = b.kind === "h2" || b.kind === "h3";
    const weight = isHeading ? 8 : b.kind === "h1" ? 10 : b.kind === "pre" ? 2 : 4;
    const blockScore = score * weight;
    if (isHeading) headingScore = Math.max(headingScore, blockScore);
    else bodyScore = Math.max(bodyScore, blockScore);

    if (!best || blockScore > best.score) {
      best = {
        heading: isHeading ? b.text : currentHeading,
        anchor: isHeading ? b.anchor : currentAnchor,
        snippet: b.text,
        score: blockScore,
      };
    }
  }

  if (!best && !titleMatch) return null;
  const total = (titleMatch ? 50 : 0) + headingScore + bodyScore;
  return {
    route: page.route,
    title: page.title,
    heading: best?.heading ?? "",
    anchor: best?.anchor ?? "",
    snippet: best?.snippet ?? "",
    score: total,
  };
}

/**
 * Docs search — the header field opens a command-palette style modal that
 * filters the build-time index (public/docs-search.json). Opens with `/`,
 * Cmd/Ctrl+K, or a click. Arrow keys move the selection, Enter navigates,
 * Esc closes.
 */
export default function DocsSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<IndexData | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetch("/docs-search.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIndex(d))
      .catch(() => setIndex(null));
  }, []);

  const openSearch = useCallback(() => {
    setOpen(true);
    setQuery("");
    setActive(0);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setActive(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  const hits = useMemo(() => {
    if (!index) return [];
    const q = query.trim();
    if (!q) {
      return index.pages
        .map((p) => ({
          route: p.route,
          title: p.title,
          heading: "",
          anchor: "",
          snippet: "",
          score: 0,
        }))
        .sort((a, b) => a.title.localeCompare(b.title));
    }
    const toks = tokens(q);
    if (toks.length === 0) return [];
    return index.pages
      .map((p) => scorePage(p, q, toks))
      .filter((h): h is Hit => h !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
  }, [index, query]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${active + 1}"]`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${active - 1}"]`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      const h = hits[active];
      if (h) window.location.href = h.route + h.anchor;
    }
  }

  function highlight(text: string) {
    const q = query.trim();
    if (!q) return text;
    const regex = new RegExp(`(${tokens(q).map(escapeRe).join("|")})`, "gi");
    const out: React.ReactNode[] = [];
    let last = 0;
    let id = 0;
    for (let m = regex.exec(text); m !== null; m = regex.exec(text)) {
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(
        <span key={`m-${m[0]}-${id++}`} className="bg-accent/25 text-inherit">
          {m[0]}
        </span>,
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  function escapeRe(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        aria-label="Open docs search"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group hidden h-9 w-full min-w-0 max-w-[22rem] items-center gap-2.5 border border-line bg-canvas px-3 text-left text-[13.5px] text-fg-faint hover:border-rule md:flex lg:max-w-[24rem]"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">
          {query ? `Searching “${query}”…` : "Search docs, APIs, guides…"}
        </span>
        <kbd className="readout border border-line px-1.5 text-[10.5px] text-fg-faint">/</kbd>
      </button>

      <button
        type="button"
        onClick={openSearch}
        aria-label="Open docs search"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-fg-muted transition-colors hover:bg-subtle hover:text-fg md:hidden"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search docs"
          className="fixed inset-0 z-[60] flex items-start justify-center bg-fg/40 px-gutter pt-[14vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="flex max-h-[min(72vh,34rem)] w-full max-w-[36rem] flex-col overflow-hidden rounded-lg border border-line-strong bg-canvas shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-fg-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search docs, APIs, guides…"
                aria-label="Search docs"
                className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-faint"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-faint transition-colors hover:bg-subtle hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {!index ? (
                <p className="px-4 py-8 text-center text-[13.5px] text-fg-faint">
                  Loading docs index…
                </p>
              ) : hits.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13.5px] text-fg-faint">
                  No results for “{query}”.
                </p>
              ) : (
                <ul ref={listRef}>
                  {hits.map((h, i) => (
                    <li key={h.route + h.anchor}>
                      <a
                        href={h.route + h.anchor}
                        data-index={i}
                        onClick={close}
                        onMouseEnter={() => setActive(i)}
                        className={`flex items-start justify-between gap-3 px-4 py-3 transition-colors ${
                          i === active ? "bg-subtle" : ""
                        }`}
                      >
                        <span className="flex min-w-0 items-start gap-2.5">
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-faint" />
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-medium text-fg">
                              {highlight(h.title)}
                              {h.heading && h.heading !== h.title ? (
                                <span className="text-fg-faint"> › {h.heading}</span>
                              ) : null}
                            </span>
                            {h.snippet ? (
                              <span className="mt-0.5 block truncate text-[12.5px] text-fg-muted">
                                {highlight(h.snippet)}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        {i === active && (
                          <span className="mt-1 flex shrink-0 items-center gap-1 text-[11px] text-fg-faint">
                            <CornerDownLeft className="h-3 w-3" />
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line bg-subtle/40 px-4 py-2 text-[11.5px] text-fg-faint">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" /> Enter to open
                </span>
                <span>↑↓ to navigate</span>
              </span>
              <span>{hits.length} results</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
