# Fixed prompt battery (friend validation)

Use **one prompt per new Agent chat**. Do not chain rewrites in the same thread. Save the full assistant reply after each run.

Label runs: `{profile}-{prompt}-{run1|run2|run3}` e.g. `mid-closure-run1`.

---

## Set A — Style stress test

### A1 — Closure

Explain what a closure is in JavaScript. Keep it useful for someone who has written a few small scripts but has not read a formal CS book.

### A2 — Node vs TypeScript (long)

I am choosing between two approaches for a small CLI tool: plain Node with `node:*` modules vs TypeScript compiled to JS. Give a recommendation and list **tradeoffs in a numbered list** (not bullets).

### A3 — Node vs TypeScript (compressed)

Rewrite your answer to question 2 so it fits in about 120 words, without using the words "basically", "simple", or "just".

*(Run A3 only in a **new** chat; do not reference A2 in the same thread unless testing continuity on purpose.)*

---

## Set B — Format + reasoning

### B1 — Flaky CI (four sections)

How should I start debugging a flaky test that only fails in CI? Answer in **exactly four sections** with these headings: `Symptoms`, `Hypotheses`, `Next checks`, `What not to do`.

### B2 — Auth PR checklist (8 lines)

Give me a checklist for reviewing a pull request that touches authentication code. Make it **at most 8 lines total** (count lines in your output).

### B3 — Idempotency (null control)

What is idempotency in APIs? Give **one short paragraph**, then **one example**, then **one non-example**.

---

## Structure metrics to record (no raw watcher-state in reports)

| Metric | How to measure |
|--------|----------------|
| Line count | `wc -l` on saved reply |
| Heading count | Count `##` lines |
| Bold tokens | Count `**...**` pairs |
| Numbered list items | Count lines matching `^\d+\.` |
| Section compliance (B1) | Exactly four `##` headings with required titles |

---

## Profiles to run against

Run the full battery (A1–A3, B1–B3) for each trained profile: `low`, `mid`, `high`. Then run **A/B control** (see [WATCHER_FRIEND_VALIDATION.md](../WATCHER_FRIEND_VALIDATION.md)) with watcher off.
