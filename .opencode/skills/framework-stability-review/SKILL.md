---
name: framework-stability-review
description: >
  Use this skill whenever asked to do a "final review", "deep review",
  "stability review", or "pre-merge review" of one or more pull requests
  against this repo (thexjs "x" framework) — especially when multiple PRs
  from parallel work are being merged around the same time. Do NOT treat a
  green CI run as sufficient signal to invoke or skip this skill: green CI
  only proves the tests that exist pass on the machines they ran on. This
  skill exists specifically for the class of bug CI cannot catch: subtle
  interactions between concurrently-developed changes, unverified
  assumptions, silent behavior changes not covered by any test, and
  cross-branch contamination. Trigger this any time the user asks to
  "review", "check stability", "make sure nothing broke", or similarly,
  regardless of CI status.
---

# Framework Stability Review

## Why this exists

CI passing means: the tests that were written, pass, on the CI runner, in
isolation, for this one PR. It does NOT mean:
- the tests cover the actual risk introduced by the change
- the change is safe when merged alongside other in-flight PRs
- assumptions stated in commit messages or PR descriptions are actually true
- the fix doesn't silently change behavior for callers not exercised by
  the new tests
- claims about "pre-existing" failures, root causes, or "unrelated" diffs
  are actually verified rather than asserted

This skill is a checklist for the review that happens BEFORE you trust
green CI, not instead of it. Never skip steps because CI is green — that
is the exact failure mode this skill exists to catch.

## When NOT to shortcut

- Do not accept "all tests pass" as a substitute for reading the diff.
- Do not accept a PR author's (or an agent's) summary of what a diff
  contains — verify against the actual diff every time, especially after
  any history of branch mix-ups, shared working directories, or multiple
  people/agents working the same repo in parallel.
- Do not skip steps because "this is a small fix" — small fixes to shared
  primitives (caches, auth, request parsing, hydration) have
  disproportionate blast radius.

## Step 1 — Establish ground truth per PR

For EACH pull request under review, independently verify (never trust a
prior summary):

```
gh pr view <N> --json title,headRefName,baseRefName,files,commits,mergeable,statusCheckRollup
gh pr diff <N>
```

Record for each PR:
- Exact head branch name and base branch
- Full list of files touched (not a paraphrase)
- The actual diff content, read in full, not skimmed by filename alone
- Every CI check name and its actual status (not "checks passed" as a
  summary — list each one)

If the PR's actual file list does NOT match what any prior conversation or
agent summary claimed it contains, STOP and flag this explicitly before
doing anything else. This has already happened once in this repo's history
(cross-branch contamination between #159 and #167) — treat every PR as
potentially contaminated until the diff is read directly.

## Step 2 — Cross-PR interaction analysis

When multiple PRs are open/being merged concurrently:

1. Build a file-touch matrix: which files does each PR modify, and does
   any file appear in more than one PR's diff? Overlapping files are a
   MERGE-ORDER risk even if each PR is individually correct — the second
   PR to merge may silently revert or conflict with the first's fix.
2. Even without direct file overlap, check for SEMANTIC coupling:
   - Does PR A introduce a new shared primitive (e.g. a cache class, a
     config flag, a validation helper) that PR B's area of the code
     could/should also be using, but isn't, because it was written in
     parallel without awareness of PR A?
   - Does PR A change the behavior of a function that PR B's tests
     implicitly depend on staying the same?
   - Do PR A and PR B both touch different call sites of the same
     underlying subsystem (e.g. both touch request-header handling, both
     touch the island hydration lifecycle) in ways that could combine
     unexpectedly?
3. Simulate the merge order the user intends and mentally (or actually, in
   a scratch branch) merge all PRs together, then re-run the full test
   suite — not just each PR's own new test file. A per-PR CI run only ever
   tested that PR against main at the time it was opened; it did NOT test
   the combined result of merging all three.

## Step 3 — Read the diff for logic, not just presence of tests

For each changed file, actually reason through:

- **Correctness of the fix relative to the original bug.** Re-derive the
  bug from first principles using the actual issue description and the
  actual before/after code — don't just check that a test exists and
  passes; check that the test would actually have caught the original bug,
  and that the fix addresses the root cause rather than the symptom the
  test happens to check.
- **Edge cases the new tests don't cover.** For every new function or
  changed branch of logic, ask: what input would break this that isn't in
  the test file? Concurrency (multiple callers hitting the same code path
  simultaneously), empty/null/zero-length inputs, very large inputs,
  malformed/adversarial inputs (especially for anything security- or
  auth-related), and interaction with existing callers not modified by
  this PR.
- **Silent behavior changes.** Does this PR change what a function returns
  or how it behaves for callers that were NOT updated as part of this PR?
  Grep the whole repo (not just the PR diff) for other call sites of any
  modified function/class and check each one is still correct under the
  new behavior.
- **Claims stated as fact but not verified.** Flag any PR description or
  commit message that asserts a root cause, a "pre-existing and unrelated"
  failure, or a compatibility claim (e.g. "Bun version mismatch caused
  this, not our change") without a linked log, test, or reproduction. Treat
  these as hypotheses to verify, not facts to accept — go find the actual
  CI log or reproduce it before repeating the claim as true.
- **Config/default changes.** Any new configuration option (feature flags,
  cache size defaults, trust boundaries) — confirm the default is the safe
  default, and confirm every existing caller/adapter that needs the
  non-default behavior actually sets it (don't assume "adapter X should
  call this" was actually done — grep for it).

## Step 4 — Full-suite verification, not per-PR verification

```
git checkout main
git pull
git merge --no-commit --no-ff <branch-1>
git merge --no-commit --no-ff <branch-2>
git merge --no-commit --no-ff <branch-3>
bun install
bun test                    # FULL suite, not a single test file
bunx biome check .
bun run typecheck
```

If this merge produces conflicts, that itself is a finding — report exactly
which files conflict and why, even if each individual PR's own CI was
green. Resolve conflicts only enough to run the suite for review purposes;
do not push this speculative merge anywhere.

If the combined suite fails somewhere no individual PR's suite failed, that
is the exact class of bug this skill exists to catch — report it as a
blocking finding, not a footnote.

## Step 5 — Report format

Produce a report with this structure. Do not omit sections even if a
section's finding is "none found" — explicitly stating "checked, none
found" is different from silence, and silence should never be read as "not
a problem".

```
## Stability Review: PR #<A>, #<B>, #<C>

### Ground truth (per PR)
- PR #<N>: head=<branch>, base=<branch>, files=[...], CI=[check: status, ...]
  (repeat per PR — state explicitly if this differs from any prior summary)

### File/semantic overlap across PRs
- [list any shared files, or explicitly "no file overlap found"]
- [list any semantic coupling risks, or explicitly "none identified"]

### Per-file logic review findings
- <file>: <finding, or "reviewed, no issues found">
  (be specific — cite line numbers / function names, not vague reassurance)

### Unverified claims flagged
- <claim from PR description/commit msg>: <verified true / verified false /
  still unverified — needs X to confirm>

### Combined-merge verification
- Merge conflicts: [none / list]
- Full suite result after combined merge: [pass/fail + details]
- Lint/typecheck after combined merge: [pass/fail]

### Recommendation
- [Safe to merge as-is / Safe to merge in order X,Y,Z / Blocking issues
  found, do not merge until resolved]
- If blocking: exact list of what must change before merge is safe.
```

## Hard rule

Never end this review with only "tests pass, looks good" as the stated
reasoning. If that is genuinely the entire finding after doing steps 1-4
honestly, say so explicitly and show the evidence (the file-touch matrix,
the combined suite run, the specific edge cases considered) — the report
must demonstrate the analysis was done, not just assert its conclusion.
