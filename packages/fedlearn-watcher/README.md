# `@viyrockan/fedlearn-watcher`

Background process that reads **Cursor’s local** `state.vscdb` in **read-only** mode (with SQLite busy timeout), extracts recent chat-like messages, learns into **`fedlearn-core` `LocalAdapter`** (same store as `fedlearn-ui`), and refreshes `.cursor/rules/fedlearn.generated.mdc` using **conversation-pattern hints only** (not adapter weights).

## Requirements

- Node 20+
- Cursor installed (macOS / Windows / Linux paths supported)
- Native module `better-sqlite3` — if install fails, run `npm rebuild better-sqlite3`

## Commands

```bash
npm run build --prefix packages/fedlearn-watcher

# Resolve BOTH global Cursor DB + workspace Storage for your project folder
node packages/fedlearn-watcher/bin/fedlearn-watcher.mjs inspect --workspace-root /path/to/repo --dump-sample

# Run watcher (adds .fedlearn/ to .gitignore when .gitignore exists)
FEDLEARN_USER_ID=check-five node packages/fedlearn-watcher/bin/fedlearn-watcher.mjs run --workspace-root /path/to/project --poll-ms 1500
```

### Where Cursor hides Composer text

Composer **user prompts** usually live in **`workspaceStorage/<id>/state.vscdb` → `aiService.generations`**. Cursor often **does not** persist full assistant transcripts in that database. FedLearn defaults to inserting a **synthetic assistant stub** paired with each user prompt so `learn→apply` can still run (`FEDLEARN_WATCHER_SYNTH_ASSISTANT=0` disables this and pairing will stall unless Cursor adds blobs we can parse).

Environment:

| Variable | Default | Purpose |
|----------|---------|---------|
| `FEDLEARN_USER_ID` | `fedlearn-watcher-user` | Same id as `fedlearn-ui` |
| `FEDLEARN_LOCAL_STORE` | (cwd file) | Shared adapter JSON path |
| `FEDLEARN_WATCHER_SYNTH_ASSISTANT` | `1` (set `0`/`false` to disable) | Pair composer users with synthetic assistant when Cursor omits replies |
| `FEDLEARN_WATCHER_LOOKBACK_MS` | `3600000` | Only turns newer than this window |
| `FEDLEARN_WATCHER_MIN_USER_CHARS` | `10` | Skip tiny user lines |
| `FEDLEARN_WATCHER_MIN_ASSISTANT_CHARS` | `20` | Skip tiny assistant replies |
| `FEDLEARN_WATCHER_PENDING_TTL_MS` | `30000` | Wall-clock pending user → assistant window |

## Honesty / limitations

- Style bullets in `.mdc` are **observed from message patterns**, not neural weights.
- JS `LocalAdapter.apply` currently updates **sessions / ε bookkeeping**; full tensor adaptation is a future bridge to Rust/WASM.
- Cursor’s DB schema can change — use `inspect` after upgrades.
- `SQLITE_BUSY`: watcher skips the poll; increase `--poll-ms` if needed.

## Privacy

All processing is local; the watcher **never writes** to Cursor’s database.
