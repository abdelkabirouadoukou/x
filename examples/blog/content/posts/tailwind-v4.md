---
title: "Tailwind CSS v4 — What's New"
date: "2026-07-25"
description: "A comprehensive look at the changes in Tailwind CSS v4, including the new CSS-first configuration."
tags: [css, tailwind, design]
---

# Tailwind CSS v4 — What's New

Tailwind CSS v4 introduces a completely new configuration model based on native CSS. Gone are the days of `tailwind.config.js` — now everything lives in your CSS.

## CSS-First Configuration

Instead of JavaScript configuration, you use `@theme` directives:

```css
@import "tailwindcss";

@theme inline {
  --color-brand: oklch(0.5 0.2 240);
  --font-display: "Inter", sans-serif;
}
```

## New Utility Classes

v4 brings new utilities like `@container` queries, `field-sizing`, and more.

## Performance

The new engine is significantly faster than v3, with sub-second rebuilds even on large projects.
