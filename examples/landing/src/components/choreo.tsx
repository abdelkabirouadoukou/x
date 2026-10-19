import type Lenis from "lenis";
import { useEffect, useRef } from "react";

/**
 * Choreo: the one island that owns scroll.
 *
 * Everything that needs GSAP / ScrollTrigger / Lenis lives HERE on purpose:
 * separate islands are separate bundles, and two copies of GSAP means two
 * ScrollTrigger registries that can't see each other. One island, one copy.
 *
 * It renders only fixed chrome (progress line, request-trace HUD, cursor) and
 * decorates the server-rendered page by selector:
 *   [data-reveal]  fade/slide in        [data-lines]  masked word-by-word title
 *   [data-scrub]   words light up       [data-count]  count-up
 *   [data-magnet]  magnetic buttons     [data-cursor] label cursor
 *   [data-phase]   request-trace phase  .lp-marq      scroll-velocity marquee
 *   .lp-rail       pinned horizontal rail (>= 900px)  .lp-drift  slow parallax
 *
 * Reduced motion: no Lenis, no reveals, no cursor. The HUD still tracks scroll.
 */

const PHASES = ["route", "load", "render", "hydrate", "respond"] as const;
const TOTAL_MS = 32; // matches the cold-start figure on the page
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export default function Choreo() {
  const barRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const msRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLElement>(null);
  const segRefs = useRef<(HTMLElement | null)[]>([]);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorLabel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const root = document.documentElement;
    const disposers: Array<() => void> = [];
    let dead = false;
    const on = <K extends keyof WindowEventMap>(
      t: K,
      fn: (e: WindowEventMap[K]) => void,
      o?: AddEventListenerOptions,
    ) => {
      window.addEventListener(t, fn as EventListener, o);
      disposers.push(() => window.removeEventListener(t, fn as EventListener));
    };

    /* ------------------------------------------------------------------ *
     * Request-trace HUD. Phases map to page sections (data-phase="0..4").
     * Each segment fills as its sections pass the middle of the viewport.
     * ------------------------------------------------------------------ */
    const phaseEls = PHASES.map((_, i) =>
      Array.from(document.querySelectorAll<HTMLElement>(`[data-phase="${i}"]`)),
    );
    let lastName = "";
    const update = () => {
      const max = Math.max(1, root.scrollHeight - innerHeight);
      const p = clamp(scrollY / max, 0, 1);
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

      const probe = scrollY + innerHeight * 0.55;
      let active = 0;
      phaseEls.forEach((els, i) => {
        let fill = 0;
        const first = els[0];
        const last = els[els.length - 1];
        if (first && last) {
          const start = first.getBoundingClientRect().top + scrollY;
          const bottom = last.getBoundingClientRect().bottom + scrollY;
          fill = clamp((probe - start) / Math.max(1, bottom - start), 0, 1);
        }
        if (fill > 0) active = i;
        const seg = segRefs.current[i];
        if (seg) {
          seg.style.setProperty("--f", fill.toFixed(3));
          seg.dataset.state = fill >= 1 ? "done" : fill > 0 ? "live" : "idle";
        }
      });
      const name = p > 0.985 ? "200 OK" : (PHASES[active] ?? PHASES[0]);
      if (name !== lastName && nameRef.current) {
        lastName = name;
        nameRef.current.textContent = name;
      }
      if (msRef.current) msRef.current.textContent = `${(p * TOTAL_MS).toFixed(1)}ms`;
    };

    let ticking = false;
    on(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          update();
        });
      },
      { passive: true },
    );
    on("resize", update);
    update();

    /* anchors work with or without Lenis */
    let lenis: Lenis | null = null;
    on("click", (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href")?.slice(1) ?? "";
      const el = id && id !== "top" ? document.getElementById(id) : document.body;
      if (!el) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(id === "top" || !id ? 0 : el, {
          duration: 1.6,
          easing: (t: number) => 1 - (1 - t) ** 4,
          offset: -72,
        });
      } else {
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      }
    });

    if (reduce) return () => disposers.forEach((d) => d());

    /* ------------------------------------------------------------------ *
     * Motion layer
     * ------------------------------------------------------------------ */
    root.classList.add("motion");
    (async () => {
      try {
        const [{ default: gsap }, { ScrollTrigger }, { default: LenisCtor }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("lenis"),
        ]);
        if (dead) return;
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });

        /* Lenis and GSAP share ONE raf loop */
        lenis = new LenisCtor({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
        lenis.on("scroll", ScrollTrigger.update);
        const raf = (time: number) => lenis?.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);
        disposers.push(() => {
          gsap.ticker.remove(raf);
          lenis?.destroy();
          lenis = null;
        });

        const mm = gsap.matchMedia();
        const ctx = gsap.context(() => {
          /* pinned horizontal rail: created first so pins precede dependants */
          mm.add("(min-width: 900px)", () => {
            const pin = document.querySelector<HTMLElement>(".lp-rail");
            const track = pin?.querySelector<HTMLElement>(".lp-track");
            const meter = pin?.querySelector<HTMLElement>(".lp-meter i");
            if (!pin || !track) return;
            const dist = () => Math.max(0, track.scrollWidth - pin.clientWidth);
            gsap.to(track, {
              x: () => -dist(),
              ease: "none",
              scrollTrigger: {
                trigger: pin,
                start: "top 64px",
                end: () => `+=${dist()}`,
                pin: true,
                scrub: 0.7,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (s) => {
                  if (meter) meter.style.transform = `scaleX(${s.progress})`;
                },
              },
            });
          });

          /* masked word-by-word titles */
          const split = (el: HTMLElement, cls: string) => {
            const words: HTMLElement[] = [];
            const walk = (node: Node) => {
              for (const ch of Array.from(node.childNodes)) {
                if (ch.nodeType === 3) {
                  const frag = document.createDocumentFragment();
                  for (const tok of (ch.textContent || "").split(/(\s+)/)) {
                    if (!tok) continue;
                    if (/^\s+$/.test(tok)) {
                      frag.appendChild(document.createTextNode(" "));
                      continue;
                    }
                    const outer = document.createElement("span");
                    outer.className = "sw";
                    outer.setAttribute("aria-hidden", "true");
                    const inner = document.createElement("span");
                    inner.className = cls;
                    inner.textContent = tok;
                    outer.appendChild(inner);
                    frag.appendChild(outer);
                    words.push(inner);
                  }
                  node.replaceChild(frag, ch);
                } else if (ch.nodeType === 1 && (ch as Element).tagName !== "BR") walk(ch);
              }
            };
            el.setAttribute("aria-label", el.textContent || "");
            walk(el);
            el.classList.add("is-split");
            return words;
          };

          for (const el of gsap.utils.toArray<HTMLElement>("[data-lines]")) {
            const words = split(el, "sl");
            gsap.set(words, { yPercent: 112, rotate: 4 });
            ScrollTrigger.create({
              trigger: el,
              start: "top 90%",
              once: true,
              onEnter: () =>
                gsap.to(words, {
                  yPercent: 0,
                  rotate: 0,
                  duration: 1.15,
                  ease: "expo.out",
                  stagger: 0.05,
                }),
            });
          }

          /* scrubbed manifesto: words light up with scroll */
          for (const el of gsap.utils.toArray<HTMLElement>("[data-scrub]")) {
            const words = split(el, "w");
            gsap.to(words, {
              opacity: 1,
              ease: "none",
              stagger: 0.12,
              scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 50%", scrub: true },
            });
          }

          /* generic reveals, batched */
          ScrollTrigger.batch("[data-reveal]", {
            start: "top 92%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: "expo.out",
                stagger: 0.08,
                overwrite: true,
              }),
          });

          /* count-ups */
          for (const el of gsap.utils.toArray<HTMLElement>("[data-count]")) {
            const target = Number.parseFloat(el.dataset.count || el.textContent || "0");
            const o = { v: 0 };
            el.textContent = "0";
            ScrollTrigger.create({
              trigger: el,
              start: "top 95%",
              once: true,
              onEnter: () =>
                gsap.to(o, {
                  v: target,
                  duration: 1.6,
                  ease: "power3.out",
                  onUpdate: () => {
                    el.textContent = String(Math.round(o.v));
                  },
                }),
            });
          }

          /* decorative ghost glyphs drift (never body copy) */
          for (const el of gsap.utils.toArray<HTMLElement>(".lp-drift")) {
            gsap.fromTo(
              el,
              { yPercent: -8 },
              {
                yPercent: 14,
                ease: "none",
                scrollTrigger: {
                  trigger: el.closest("section") || el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          }
        });
        disposers.push(() => {
          ctx.revert();
          mm.revert();
        });

        /* scroll-velocity marquees */
        const marqs = gsap.utils.toArray<HTMLElement>(".lp-marq").map((el, i) => {
          const group = el.querySelector<HTMLElement>(".lp-marq-group");
          return { el, gw: group?.getBoundingClientRect().width ?? 0, x: 0, dir: i % 2 ? 1 : -1 };
        });
        const measureMarq = () => {
          for (const m of marqs) {
            m.gw =
              m.el.querySelector<HTMLElement>(".lp-marq-group")?.getBoundingClientRect().width ?? 0;
          }
        };
        document.fonts?.ready.then(measureMarq);
        on("resize", measureMarq);
        const marqTick = (_t: number, dt: number) => {
          const v = lenis?.velocity ?? 0;
          const boost = 1 + Math.min(Math.abs(v) * 0.4, 7);
          for (const m of marqs) {
            if (!m.gw) continue;
            m.x += m.dir * ((70 * dt) / 1000) * boost;
            if (m.x <= -m.gw) m.x += m.gw;
            if (m.x > 0) m.x -= m.gw;
            m.el.style.transform = `translate3d(${m.x}px,0,0)`;
          }
        };
        gsap.ticker.add(marqTick);
        disposers.push(() => gsap.ticker.remove(marqTick));

        /* magnetic buttons + label cursor (fine pointers only) */
        if (fine) {
          for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-magnet]"))) {
            const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1,0.5)" });
            const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1,0.5)" });
            const move = (e: PointerEvent) => {
              const r = el.getBoundingClientRect();
              xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
              yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
            };
            const out = () => {
              xTo(0);
              yTo(0);
            };
            el.addEventListener("pointermove", move);
            el.addEventListener("pointerleave", out);
            disposers.push(() => {
              el.removeEventListener("pointermove", move);
              el.removeEventListener("pointerleave", out);
            });
          }

          const ring = cursorRef.current;
          const label = cursorLabel.current;
          if (ring && label) {
            const cx = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
            const cy = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });
            on(
              "pointermove",
              (e) => {
                ring.classList.add("is-on");
                cx(e.clientX);
                cy(e.clientY);
              },
              { passive: true },
            );
            on("pointerover", (e) => {
              const t = (e.target as Element | null)?.closest?.("[data-cursor]");
              if (t) {
                label.textContent = t.getAttribute("data-cursor") || "";
                ring.classList.add("is-label");
              } else ring.classList.remove("is-label");
            });
            const hide = () => ring.classList.remove("is-on");
            document.addEventListener("pointerleave", hide);
            disposers.push(() => document.removeEventListener("pointerleave", hide));
          }
        }

        /* layout is final once fonts are in */
        document.fonts?.ready.then(() => {
          ScrollTrigger.refresh();
          update();
        });
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          update();
        });
      } catch {
        // motion is an enhancement: if it fails, show the static page
        root.classList.remove("motion");
      }
    })();

    return () => {
      dead = true;
      root.classList.remove("motion");
      for (const d of disposers) d();
    };
  }, []);

  return (
    <>
      <div className="lp-bar" ref={barRef} aria-hidden="true" />

      <div className="lp-hud" ref={hudRef} aria-hidden="true">
        <span className="lp-hud-req">GET /</span>
        <div className="lp-hud-segs">
          {PHASES.map((p, i) => (
            <i
              key={p}
              className="lp-seg"
              data-state="idle"
              ref={(el) => {
                segRefs.current[i] = el;
              }}
            >
              <b>{p}</b>
            </i>
          ))}
        </div>
        <span className="lp-hud-name" ref={nameRef}>
          route
        </span>
        <span className="lp-hud-ms" ref={msRef}>
          0.0ms
        </span>
      </div>

      <div className="lp-cursor" ref={cursorRef} aria-hidden="true">
        <span ref={cursorLabel} />
      </div>
    </>
  );
}
