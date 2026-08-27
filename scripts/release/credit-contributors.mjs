#!/usr/bin/env bun
/**
 * Enriches newly published GitHub release notes with a "Contributors" section.
 *
 * Changesets/action creates one release per published package from the
 * changelog, but those notes credit no one. This script finds each release
 * tag and appends a list of the distinct humans whose commits shipped in that
 * release. GitHub's dependabot/actions bots are excluded from the human
 * shout-outs.
 *
 * Contributors are the distinct authors of every commit between the release's
 * tag and the previous tag of the *same package*. The baseline is resolved per
 * package via `git tag --list` so mixed tag namespaces never interfere.
 *
 * Run in CI after `changesets/action` publishes. Requires `GITHUB_TOKEN` with
 * `contents: write` and read access to the repo. Idempotent: releases that
 * already carry a `## Contributors` section are skipped.
 */

import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY ?? "abdelkabirouadoukou/x";
const dryRun = process.argv.includes("--dry-run");
if (!token && !dryRun) {
  console.error("GITHUB_TOKEN is required");
  process.exit(1);
}

const GH = "https://api.github.com";
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function api(path, method = "GET", body) {
  const res = await fetch(`${GH}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${method} ${path}: ${res.status} ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Distinct human commit authors in the given git range (newest..HEAD). */
function humanAuthors(range) {
  const log = execSync(`git log --format='%an|%ae' ${range}`, { encoding: "utf-8" });
  const seen = new Map(); // email -> name
  for (const line of log.split("\n")) {
    if (!line) continue;
    const idx = line.indexOf("|");
    const name = line.slice(0, idx).trim();
    const email = line
      .slice(idx + 1)
      .trim()
      .toLowerCase();
    if (!name || !email) continue;
    // Bots are called out separately; never credit them as humans.
    if (
      /bot|dependabot|github-actions|\[bot\]/i.test(name) ||
      /\bbot\b|noreply\.github\.com$/.test(email)
    ) {
      continue;
    }
    if (!seen.has(email)) seen.set(email, name);
  }
  return seen;
}

/** Version namespace (tag prefix before the `@x.y.z` portion). */
function familyPrefix(tag) {
  return tag.replace(/@?\d+(\.\d+){0,2}(-\d+)?$/, "");
}

async function run() {
  // All release tags, newest-first per package namespace.
  const tags = execSync(`git tag --sort=-v:refname`, { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);

  // Group tags by family, preserving newest-first order for each.
  const byFamily = new Map();
  for (const tag of tags) {
    const prefix = familyPrefix(tag);
    if (!byFamily.has(prefix)) byFamily.set(prefix, []);
    byFamily.get(prefix).push(tag);
  }

  for (const [_prefix, familyTags] of byFamily) {
    for (let i = 0; i < familyTags.length; i++) {
      const tag = familyTags[i];
      const prevTag = familyTags[i + 1] ?? null; // next in newest-first = previous release

      let release;
      if (dryRun) {
        release = { id: 0, tag_name: tag, draft: false, prerelease: false, body: "" };
      } else {
        try {
          release = await api(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`);
        } catch (_err) {
          continue; // no release object for this tag yet
        }
      }
      if (!release || release.draft || release.prerelease) continue;
      if (release.body?.includes("## Contributors")) continue; // idempotent

      const range = prevTag ? `${prevTag}..${tag}` : `${tag}`;
      const authors = humanAuthors(range);
      if (authors.size === 0) continue;

      const section = [
        `## Contributors`,
        ``,
        `Thanks to everyone who helped ship this release:`,
        ``,
        ...[...authors.values()].map((name) => `- **${name}**`),
        ``,
      ].join("\n");

      const newBody = `${release.body ?? ""}\n\n${section}`;
      if (dryRun) {
        console.log(`[dry-run] ${tag}: crediting ${[...authors.values()].join(", ")}`);
        continue;
      }
      await api(`/repos/${repo}/releases/${release.id}`, "PATCH", { body: newBody });
      console.log(`Credited ${authors.size} contributor(s) on release ${tag}`);
    }
  }
  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
