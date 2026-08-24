# @thexjs/mcp

An [MCP](https://modelcontextprotocol.io) server that gives AI coding agents
(Claude Code, Claude Desktop, Cursor, Windsurf, etc.) grounded, accurate
knowledge of the **x** framework — instead of letting them pattern-match to
Next.js / Remix / Astro / TanStack Start syntax that looks similar but isn't
the same.

Every project scaffolded with `bun create thexjs-app@latest` already wires
this up (`.mcp.json` for Claude Code, `.cursor/mcp.json` for Cursor). To add
it to an existing project by hand:

```json
{
  "mcpServers": {
    "thexjs": {
      "command": "bunx",
      "args": ["@thexjs/mcp"]
    }
  }
}
```

## Tools

- **`list_topics`** — lists every doc topic (routing, loaders, actions, env,
  auth, config, ...).
- **`get_docs`** — returns grounded reference docs for a topic, including
  explicit "this is NOT X's syntax" corrections for the conventions agents
  most often get wrong (loaders, server actions, env prefixing).
- **`search_docs`** — full-text search across all topics.
- **`scaffold_file`** — generates a correctly-shaped file (page, dynamic
  page, layout, middleware, api-route, action) with the right exports, path,
  and conventions, ready to paste.

## Why this exists

x deliberately diverges from Next.js/Remix/TanStack Start in a few specific
places (no `"use server"` directives, underscore-prefixed special files,
`THEXJS_PUBLIC_` env prefix, a loader shape that isn't a Response). Those are
exactly the details a general-purpose coding agent is likely to get wrong
from training data alone, confidently. This server is the fix: ground the
agent in the framework's actual conventions before it writes code, rather
than relying on it to have memorized a small framework's syntax correctly.

## Local dev / run without publishing

```bash
bun run start   # from packages/mcp — runs src/index.ts directly over stdio
```
