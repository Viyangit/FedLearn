# @viyrockan/fedlearn-orchestrator

Guaranteed per-turn orchestration wrapper for FedLearn MCP flow.

It enforces:
1) `pre_turn`
2) `get_personalization_context`
3) model response generation
4) `learn_from_turn`

Use this package when host clients may skip MCP tools in best-effort mode.

## API

- `runTurn({ userId, conversationId, userInput, modelAdapter, mcp, turnId? })`
- Adapters:
  - `createCursorAdapter(...)`
  - `createClaudeDesktopAdapter(...)`
  - `createAntiGravityAdapter(...)`

## Reliability guards

- Retries MCP stage calls once by default (`maxRetries=1`).
- Includes `turnId` idempotency field for retry-safe `learn_from_turn`.
- Emits structured per-stage logs via `onLog`:
  - `flowStage`
  - `success`
  - `latencyMs`
  - `retries`

## Guaranteed local chat (recommended when Cursor skips tools)

`createGuaranteedLocalRunner(userId)` runs **learn + apply every turn** using `fedlearn-core` `LocalAdapter` only (no MCP). Use the same `--user-id` and working directory (or `FEDLEARN_LOCAL_STORE`) as `@viyrockan/fedlearn-ui` so the terminal panel updates immediately.

After `npm run build`:

```bash
node bin/fedlearn-guaranteed-chat.mjs --user-id check-five
```

One line:

```bash
node bin/fedlearn-guaranteed-chat.mjs --user-id check-five --once hello world
```

Programmatic:

```ts
import { createGuaranteedLocalRunner } from "@viyrockan/fedlearn-orchestrator";

const runner = await createGuaranteedLocalRunner("check-five");
const out = await runner.runTurn({ userInput: "plan my day" });
// out.reply defaults to `[fedlearn-local-echo] plan my day` unless you pass `reply:`
```

