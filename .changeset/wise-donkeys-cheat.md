---
"create-thexjs-app": patch
---

Fix two issues in the generated projects produced by the scaffolder:

- The `.gitignore` was silently missing from generated projects because npm
  strips files named `.gitignore` from published tarballs, even inside nested
  template directories. Templates now ship an `_gitignore` file that the
  scaffolder renames to `.gitignore` when copying the base template, so the
  file survives publication.
- `git init` now forces the default branch to `main` (`git init -b main`)
  instead of inheriting the user's `init.defaultBranch` config, which could
  otherwise produce a `master` branch.
