---
"@thexjs/core": minor
---

Frontmatter is now parsed as real YAML via Bun's native parser instead of a
hand-rolled line subset that silently dropped anything non-trivial.

What changed:

- Nested mappings (`seo:\n  title: ...`), block scalars (`|`, `>`), and
  `- item` sequence syntax parse correctly instead of losing data.
- Scalar types are coerced per YAML 1.2 (`draft: true` → boolean,
  `priority: 10` → number, `price: null` → null). Previously everything stayed
  a string.
- Malformed YAML and non-mapping top-level values (e.g. a bare sequence) now
  throw a build-time error naming the offending file instead of being silently
  discarded.
- The closing `---` delimiter is now recognized only at the start of its own
  line, so a value like `title: a---b` no longer truncates the frontmatter.

Behavioral notes: a value containing `: ` (colon + space) must now be quoted
per YAML rules, and `key:` with no value yields `null` rather than `""`.