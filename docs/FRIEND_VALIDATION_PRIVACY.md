# FedLearn privacy and security (friend validation / watcher-only)

One-page summary for demos on a **local Mac** with **`npx @viyrockan/fedlearn watch`**. For full scaffold vs production status see [PRIVACY_GUARANTEES.md](PRIVACY_GUARANTEES.md).

## What stays on the machine

| Data | Location | Contents |
|------|----------|----------|
| Adapter bookkeeping | `FEDLEARN_LOCAL_STORE` or `./.fedlearn-local-adapters.json` | Session count, ε budget counters, adapter tensors — **not** full chat transcripts |
| Watcher cursor state | `.fedlearn/watcher-state.json` | Last **20 user message strings**, pair hashes, fingerprints |
| Generated rules | `.cursor/rules/fedlearn.generated.mdc` | **Aggregate** style hints + metrics (user id, %, ε) |
| Cursor source DB | `~/Library/Application Support/Cursor/.../state.vscdb` | Read **only** by watcher; FedLearn does not write here |

## Processing guarantees (watcher path)

1. **Local-only** — No FedLearn cloud training service in the JS/MCP path ([MCP_INTEGRATION.md](MCP_INTEGRATION.md)). Optional `npx fedlearn-core verify-local` asserts no `fetch` egress during a probe flow.
2. **Read-only Cursor DB** — SQLite opened with `readonly: true` ([`packages/fedlearn-watcher/src/cursorReader.ts`](../packages/fedlearn-watcher/src/cursorReader.ts)); busy polls skip rather than blocking Cursor.
3. **Minimized export to the agent** — [`extractStyleHints`](../packages/fedlearn-watcher/src/styleHints.ts) emits bullets like “User sends short messages”, not pasted chat logs.
4. **Forbidden persistence fields** — Adapter store rejects `rawInteractions`, `sessionGradients`, etc. ([`adapter_store.ts`](../packages/fedlearn-js/src/browser/adapter_store.ts)).
5. **Honesty in rules** — Generated `.mdc` states patterns are from **recent messages**, not adapter-weight inference (weights need Rust/WASM bridge).
6. **ε budget bookkeeping** — Each learned turn increases `consumedEpsilon` (capped per apply in [`LocalAdapter.apply`](../packages/fedlearn-js/src/local_adapter.ts)); displayed in `.mdc` as accountability, not a legal DP certificate in the Node scaffold.

## Limitations (say these out loud in demos)

- **Not end-to-end differential privacy on every Cursor turn** in the current JS watcher loop — Rust core has DP-SGD / Rényi / HMAC budget **scaffold**; production-grade guarantees are listed as **pending** in [PRIVACY_GUARANTEES.md](PRIVACY_GUARANTEES.md).
- **Node budget HMAC** uses scaffold signing in the local JSON path; tamper-evident verification is fully exercised in Rust [`budget.rs`](../crates/fedlearn-core/src/privacy/budget.rs).
- **`.fedlearn/watcher-state.json` can contain sensitive user text** (up to 20 messages) — treat as private; watcher appends `.fedlearn/` to `.gitignore` when a `.gitignore` exists.
- **Synthetic assistant lines** — When Cursor omits assistant bodies, watcher may pair user prompts with a stub (`FEDLEARN_WATCHER_SYNTH_ASSISTANT=0` disables); learning signal is weaker but avoids inventing private assistant content from disk.
- **MCP debug logging** — If using MCP later, `FEDLEARN_MCP_AGENT_LOG=1` can POST debug events to localhost only; **not** used by watcher-only setup.

## Risk themes (engineering register)

From [FedLearn Risk and Considerations Register.md](../FedLearn%20Risk%20and%20Considerations%20Register.md):

- Session raw state must not persist to disk
- Privacy budget tampering / exhaustion
- Proxy corpus must not contain private interactions (federation path)

## Hygiene for friend testing

1. Set `FEDLEARN_USER_ID` and `FEDLEARN_LOCAL_STORE` **outside** the git repo (e.g. `~/.fedlearn-validation/`).
2. Do **not** commit `fedlearn.generated.mdc` or `.fedlearn/` if they reflect real chats — use a throwaway workspace or keep them gitignored.
3. Share reports using **metrics only** (`check-acceptance.mjs` JSON: hint bullet count, pattern %, sessions) — not `watcher-state.json` bodies.
4. Stop `watch` when finished; Ctrl+C ends the process.

## Core privacy building blocks (future / federation)

| Component | Role |
|-----------|------|
| `dp_sgd_step` | Clip gradients + calibrated noise |
| `RenyiAccountant` | Track ε spend |
| `BudgetState` sign/verify | Detect tampering with budget JSON |

Validated in `cargo test -p fedlearn-core --test privacy`.

## What to tell stakeholders

> FedLearn on your laptop **reads Cursor’s DB read-only**, learns **local pattern hints**, writes **aggregate rules** for the agent, and tracks a **local ε budget counter**. It does **not** send your chats to a FedLearn training cloud in this path. Strongest privacy guarantees apply to the **federation/Rust** roadmap; the **friend demo** proves **local control, minimization, and transparency** of what is stored and injected.
