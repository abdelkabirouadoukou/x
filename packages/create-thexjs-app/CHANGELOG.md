# create-thexjs-app

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
