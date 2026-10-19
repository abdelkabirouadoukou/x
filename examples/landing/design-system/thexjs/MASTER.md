# thexjs landing: design system (MASTER)

Built with the ui-ux-pro-max workflow (pattern, style, colour, type, effects, anti-patterns, checklist)
and the techniques from abdelkabir.me (Lenis driven by the GSAP ticker, pinned rail, scrubbed copy,
variable-weight name, dot field, velocity marquee, hard colour blocks).

## 1. Pattern
Hero + Features + CTA, told as one long scroll: hero, marquee, manifesto, pinned rail (toolkit), stats,
tour, benchmarks, API, compare, closing CTA. Skill guidance kept: install command in the hero, deep
CTA at the bottom, reduced-motion renders the final static state.

## 2. Style (skill: Brutalism, light + dark supported)
Bold type 700+, visible 1px rules, large colour blocks, sharp corners, mono micro-labels.
Alternating grounds: white / ink / signal green / tint. No gradients, glass or shadows.

## 3. Colour
| token | value | use |
|---|---|---|
| --c-canvas / --c-fg | #fff / #0a0a0a | default ground / text |
| .dark canvas | #0d0a0c | marquee, rail, CTA |
| --c-accent | #009150 | accent on light (4.9:1 on white) |
| --lp-signal | #28dc82 | accent on ink; stats block (ink text on it, ~11:1) |

## 4. Type (all self-hosted; CSP is `font-src 'self'`)
- Display: Archivo variable (wght 100-900, wdth 62-125), tight tracking
- Accent: Instrument Serif italic, for the emphasis word in every headline
- Mono: Martian Mono, labels / code / numbers

## 5. Motion (one GSAP + Lenis copy, in the Choreo island)
- Request-trace HUD: route > load > render > hydrate > respond, filling as sections pass (illustrative; 32ms matches the cold-start stat)
- Masked word reveals, scrubbed manifesto, batched reveals, count-ups, pinned rail (>= 900px)
- Scroll-velocity marquee, magnetic buttons, label cursor (fine pointers only)
- Variable-weight "thexjs" wordmark reacts to the pointer; dot field repels it

## 6. Anti-patterns avoided
Emoji icons, scroll-jacking without escape, parallax on body copy, hover-only information,
hidden-by-default content without a JS gate, motion that ignores prefers-reduced-motion.

## 7. Checklist
- [x] prefers-reduced-motion: no Lenis, no reveals, no cursor, static wordmark, HUD still tracks scroll
- [x] Rail only pins >= 900px; below that it is a native scroll-snap row
- [x] Reveal states exist only under `html.motion`; Choreo removes it if GSAP fails to load
- [x] Focus states visible (inherited global outline); decorative layers aria-hidden
- [x] 390 / 1280 / 1440 checked, no horizontal overflow, zero console errors
