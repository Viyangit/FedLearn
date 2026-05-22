# Training messages for style hints (paste in Cursor Composer)

Use these **while `npx @viyrockan/fedlearn watch` is running** in the project root. The watcher learns **user** lines only; send several messages per profile before running the fixed prompt battery.

## Profile: `low` (minimal pattern signal)

Send 3–5 short, neutral questions (no lists, no “exactly N sections”):

1. What does REST mean in APIs?
2. How do I list files in a folder with Node?
3. When should I use try/catch around async code?

**Expected hints (approximate):** short messages and/or questions — not list-heavy or long-form.

## Profile: `mid` (lists + brevity)

Send 5–8 messages using **numbered lists** and **line limits**:

1. Give me a numbered list of three ways to handle env vars in Node.
2. Answer in at most 8 lines: how do I run tests in CI?
3. Steps to debug a 404 from fetch — use a numbered list only.
4. List five checks before shipping a small CLI — numbered, no bullets.
5. Keep your reply under 8 lines: explain semver briefly.

**Expected hints:** “structures requests as lists”, possibly short/direct mix.

## Profile: `high` (long direct instructions)

Send 5–8 **long, imperative** messages (no “please”, minimal questions):

1. Write a detailed runbook for onboarding a new service: use exact section headings Symptoms, Hypotheses, Next checks, What not to do. Use bold for tooling names and flags.
2. I need a thorough comparison of plain Node versus TypeScript for a CLI that will grow for months — include tradeoffs and a clear recommendation paragraph.
3. Document auth review steps for a pull request: JWT claims, cookies, CORS, server-side authz. Be exhaustive and operational.
4. Explain closures with multiple real-script examples and a one-sentence summary at the end.
5. When debugging flaky CI, prioritize reproducible commands, TZ=UTC, serial test runs, and do not suggest blind sleeps.

**Expected hints:** “detailed, long-form messages”, “direct instructions”, possibly code-heavy.

## After training

1. Confirm `.cursor/rules/fedlearn.generated.mdc` updated (mtime).
2. Diff the **Conversation pattern hints** section across profiles — it should differ, not only the % line.
3. Run `node scripts/friend-validation/check-acceptance.mjs --workspace-root .`
