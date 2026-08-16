# create-thexjs-app

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
