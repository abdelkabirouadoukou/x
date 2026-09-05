# create-thexjs-app

## 1.2.3

### Patch Changes

- 7701dcf: Update @types/node devDependency via dependabot.

## 1.2.2

### Patch Changes

- c0073da: Surface the underlying git error when `git init` fails during scaffolding instead of always reporting a generic "is git installed?" message.
- 4c4ac8a: Fix `--shadcn` scaffolding silently dropping the shadcn feature when the tailwind auto-enable ran; missing feature requirements are now auto-enabled generically from the `requires` metadata and the selected features are always kept.
- ff588b6: Every scaffolded project now ships AI-agent wiring: `.mcp.json` (Claude Code) and `.cursor/mcp.json` pointing at the `thexjs` MCP server, plus an `AGENTS.md` conventions reference with a `CLAUDE.md` pointer.

## 1.2.1

### Patch Changes

- f537c1c: `create-thexjs-app` now falls back to its OWN pinned fallback version for
  `@thexjs/cli` (`FALLBACK_CLI_VERSION`) when the npm registry lookup fails,
  instead of reusing the core fallback — an offline scaffold was pinning
  `@thexjs/cli` to whatever the core fallback happened to be.
  
  Pure helpers were extracted into a side-effect-free `src/package-json.ts`
  (`buildPackageJson`, `resolveVersions`, and the `FALLBACK_*` constants) so the
  scaffolding logic is unit-testable without triggering the CLI entrypoint.
  Adds the package's first test file (`package-json.test.ts`, 7 tests).

## 1.2.0

### Minor Changes

- e7788a1: Add a `--hooks` option that scaffolds `@thexjs/hooks` as a dependency in new
  x apps, next to the existing `--auth` and `--content` addons. No template files
  are required: the addon is a dependency-only opt-in (the hooks package ships no
  CLI-side assets).

## 1.1.3

### Patch Changes

- b22e149: chore(deps-dev): bump @biomejs/biome from 1.9.4 to 2.5.8 and migrate config (formatting/lint fixes only)
- db6cb35: chore(deps-dev): bump @types/node from 22.20.1 to 26.2.0

## 1.1.2

### Patch Changes

- c8e7985: Fix bugs that shipped in freshly scaffolded apps:
  
  - Add `@types/bun` to the base template devDependencies — the generated
    `tsconfig.json` sets `"types": ["bun"]`, but without the types package every
    scaffolded app failed typecheck with TS2688.
  - The Tailwind addon's `globals.css` defined theme colors as bare channel
    triples (`--color-background: var(--background)` where the value is
    `255 255 255`), so Tailwind utilities produced invalid color values. They
    now wrap in `rgb(...)`.
  - Add a `src/pages/about.tsx` to the base template so the "Next steps" link
    on the home page isn't a 404.
  - Bump the stale `FALLBACK_CORE_VERSION` (used when the registry query fails)
    from `0.1.0` to the current `1.2.2`.

## 1.1.1

### Patch Changes

- 369e737: Fix two issues in the generated projects produced by the scaffolder:

  - The `.gitignore` was silently missing from generated projects because npm
    strips files named `.gitignore` from published tarballs, even inside nested
    template directories. Templates now ship an `_gitignore` file that the
    scaffolder renames to `.gitignore` when copying the base template, so the
    file survives publication.
  - `git init` now forces the default branch to `main` (`git init -b main`)
    instead of inheriting the user's `init.defaultBranch` config, which could
    otherwise produce a `master` branch.

## 1.1.0

### Minor Changes

- 4ecb4e2: Redesign the scaffolder around a single universal base template with
  interactive feature selection (Next.js-style), powered by `@clack/prompts`.
  Users choose from Tailwind CSS, shadcn/ui, a SQLite-backed demo auth, and
  content collections instead of picking a full pre-built app template.

  - Generated projects now auto-initialize a git repo and ship a complete
    `.gitignore`.
  - New JSON / non-interactive CLI flags for scripting: `--tailwind`,
    `--shadcn`, `--auth`, `--content`, `--no-install`, `--no-git`, `--dev`.
  - Removes the five large app templates (basic, blog, default, landing, saas)
    in favor of the lean addon system.

## 1.0.0

### Major Changes

- b010e14: Release 1.0.0 of all packages.
