# @viyrockan/fedlearn-ui

Persistent terminal dashboard UI for FedLearn.

## Usage

```bash
npx @viyrockan/fedlearn-ui
```

Run once:

```bash
npx @viyrockan/fedlearn-ui --once
```

Use the same logical user as your app or CLI:

```bash
npx @viyrockan/fedlearn-ui --user-id check-five
```

## Why the panel might not change after “a few chats”

The dashboard only reflects data that **FedLearn persisted** for that user: `LocalAdapter.load(userId)` reads `sessionCount`, budget, etc. Typical reasons it stays flat:

1. **Cursor (or any chat UI) is not wired to `LocalAdapter`.** Having a conversation here does not call `beginSession` / `learn` / `apply`, so nothing updates.
2. **Wrong user id.** The default CLI user is `cli-dashboard` (override with `FEDLEARN_USER_ID`). The UI defaults to `fedlearn-ui-dashboard` unless you pass `--user-id`. Use the **same id** everywhere you want one dashboard.
3. **Different save location between runs.** Under Node, adapters are stored in **`./.fedlearn-local-adapters.json` relative to each process current working directory**, or wherever **`FEDLEARN_LOCAL_STORE`** points. Run the UI and writers from the **same folder**, or set the same `FEDLEARN_LOCAL_STORE` path explicitly.

Minimal check (from your project folder; use the same user id as the UI):

```bash
node --input-type=module -e "
import { LocalAdapter } from \"fedlearn-core\";
const id = \"check-five\";
const adapter = await LocalAdapter.load(id);
const session = adapter.beginSession(\"smoke\");
await session.learn([{ input: \"a\", output: \"b\", loss: 0.1 }]);
await adapter.apply(await session.close());
console.log(\"sessions\", (await LocalAdapter.load(id)).snapshot().sessionCount);
"
```

If that increments `sessions`, persistence and user id are correct; hook your product’s chat loop the same way.

