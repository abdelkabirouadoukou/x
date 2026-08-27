---
"@thexjs/cli": patch
---

Fix a flaky `tailwind.test.ts` serialization test that intermittently failed CI (`Test / ubuntu-latest`) due to a missing-file race in `readFileSync` and a start-timing race after process close. The compile-serialization contract is preserved.
