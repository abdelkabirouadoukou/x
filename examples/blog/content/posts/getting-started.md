---
title: "Getting Started with x Framework"
date: "2026-07-26"
description: "Learn how to build your first fullstack application with x framework."
tags: [tutorial, x-framework]
---

# Getting Started with x Framework

x is a fullstack framework for Bun that lets you build static sites, SSR pages, API routes, and server functions — all in one process.

## Quick Start

Create a new project and define your routes in `src/pages/`:

```
my-app/
├── src/
│   ├── pages/
│   │   ├── index.tsx
│   │   └── about.tsx
│   ├── layouts/
│   │   └── main.tsx
│   └── api/
│       └── hello.ts
├── content/
└── x.config.ts
```

## File-based Routing

Each file in `src/pages/` becomes a route automatically:

| File | Route |
|------|-------|
| `src/pages/index.tsx` | `/` |
| `src/pages/about.tsx` | `/about` |
| `src/pages/blog/[slug].tsx` | `/blog/:slug` |
