"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Boot Intro — the cinematic GSAP preloader.
 *
 * A fullscreen deep-space overlay: a JetBrains-Mono counter climbs to 100%,
 * a starfield collapses inward into the glowing neon x, then a hyper-jump
 * zoom (scale 8, power4.inOut) dissolves the overlay and the hero staggers
 * in beneath it.
 *
 * The overlay markup is server-rendered (so there is never a flash of the
 * hero before hydration), and every animation runs client-side only. GSAP
 * is imported dynamically inside the effect so it never touches the SSR
 * bundle. Once the sequence has run in a session it is skipped (the reveal
 * still plays) so back-navigation never re-plays the full intro.
 *
 * Reduced motion: skip straight to the hero reveal, no zoom.
 */

const STARS = 90;

export default function BootIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadyPlayed = sessionStorage.getItem("x-boot-intro") === "played";

    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const starLayer = root.querySelector<HTMLElement>("[data-stars]");
      const counter = root.querySelector<HTMLElement>("[data-counter]");
      const xMark = root.querySelector<HTMLElement>("[data-x]");
      const bolt = root.querySelector<HTMLElement>("[data-bolt]");
      const heroReveals = gsap.utils.toArray<HTMLElement>("[data-hero-reveal]");

      const finish = () => setGone(true);

      // Populate the starfield (client-side only so SSR stays clean).
      if (starLayer && !reduceMotion) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < STARS; i++) {
          const s = document.createElement("span");
          s.className = `boot-star${i % 4 === 0 ? " bright" : ""}`;
          s.style.left = `${Math.random() * 100}%`;
          s.style.top = `${Math.random() * 100}%`;
          s.style.opacity = `${0.3 + Math.random() * 0.7}`;
          frag.appendChild(s);
        }
        starLayer.appendChild(frag);
      }

      // The hero reveal runs either way: after the intro, or immediately.
      const playReveal = () => {
        if (heroReveals.length === 0) return;
        gsap.from(heroReveals, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "all",
        });
      };

      if (reduceMotion || alreadyPlayed) {
        setGone(true);
        playReveal();
        return;
      }

      sessionStorage.setItem("x-boot-intro", "played");

      // Hide the hero from frame one so the overlay fade-out never exposes a
      // fully-visible page before the stagger begins.
      gsap.set(heroReveals, { opacity: 0, y: 40 });

      const tl = gsap.timeline({
        onComplete: finish,
      });

      // 1 — counter 0 → 100 in JetBrains Mono.
      const counterObj = { v: 0 };
      tl.to(counterObj, {
        v: 100,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: () => {
          if (counter) counter.textContent = `${Math.round(counterObj.v)}%`;
        },
      });

      // 2 — starfield twinkles in, then collapses into the center.
      tl.fromTo(
        ".boot-star",
        { opacity: 0, scale: 0.2 },
        {
          opacity: (_i, el) => Number((el as HTMLElement).style.opacity),
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.01,
        },
        "-=1.0",
      );
      tl.to(
        ".boot-star",
        {
          xPercent: 0,
          x: () => gsap.utils.random(-8, 8),
          y: () => gsap.utils.random(-8, 8),
          opacity: 0,
          scale: 0,
          duration: 0.6,
          ease: "power2.in",
          stagger: 0.008,
        },
        "+=0.1",
      );

      // 3 — the neon x ignites, bolt flash.
      tl.fromTo(
        xMark,
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)" },
        "-=0.3",
      );
      tl.fromTo(
        bolt,
        { opacity: 1 },
        { opacity: 0, scale: 3, duration: 0.4, ease: "power2.out" },
        "<",
      );

      // 4 — hyper-jump: camera smashes through the x into the hero.
      tl.to(root, { scale: 8, opacity: 0, duration: 0.7, ease: "power4.inOut" }, "+=0.25");
      tl.add(() => setGone(true), "-=0.05");
      tl.to(
        heroReveals,
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: "power3.out", clearProps: "all" },
        "+=0.05",
      );

      cleanup = () => {
        gsap.killTweensOf("*");
        setGone(true);
      };
    })();

    return () => cleanup?.();
  }, []);

  if (gone) return null;

  return (
    <div ref={rootRef} className="boot-intro" aria-hidden="true">
      {/* Without JS the fixed overlay would block the page forever; hide it
          so a JS-less visitor still sees the static hero. */}
      <noscript>
        <style>{".boot-intro{display:none}"}</style>
      </noscript>
      <div data-stars className="boot-stars" />
      <div data-bolt className="boot-bolt" />
      <div data-x className="boot-x">
        x
      </div>
      <div data-counter className="boot-counter">
        0%
      </div>
    </div>
  );
}
