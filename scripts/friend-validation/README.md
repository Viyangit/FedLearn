# Friend validation scripts

Watcher-only experiment helpers. Full procedure: [docs/WATCHER_FRIEND_VALIDATION.md](../../docs/WATCHER_FRIEND_VALIDATION.md).

| File | Purpose |
|------|---------|
| `profile-env.example.sh` | `source ... low\|mid\|high` — isolated user id + store |
| `session-targets.mjs` | Session count → pattern coverage % |
| `train-hint-messages.md` | Paste-in Composer messages per profile |
| `check-acceptance.mjs` | JSON acceptance report (no raw user text) |

```bash
npm run friend-validation:targets
npm run friend-validation:check -- --workspace-root /path/to/cursor/project
```
