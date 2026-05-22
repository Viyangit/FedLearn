# @viyrockan/fedlearn-mcp

MCP server that bridges **Cursor, Claude Desktop, and AntiGravity MCP tool calls** into **FedLearn local continual learning**.

## Modes

### Best-effort mode

Use this package directly and let the chat client decide tool usage.
Tool flow should be: `pre_turn` -> `get_personalization_context` -> answer -> `learn_from_turn`.

### Guaranteed mode

Use this package with `@viyrockan/fedlearn-orchestrator` to enforce the full flow every exchange from host code.

It uses an explicit 4-step loop:
1) `pre_turn(...)` for immediate micro-progress update,
2) `get_personalization_context(...)` before answering,
3) answer conditioned on returned context,
4) `learn_from_turn(...)` after answering.

## Inputs

- `pre_turn(userId?, conversationId, latestInput?)`
- `get_personalization_context(userId?, conversationId, latestInput?)`
- `learn_from_turn(userId, conversationId, input, output, turnId?)`

## Outputs

- `pre_turn`: immediate micro-progress summary so percentage can move each exchange.
- `get_personalization_context`: moderate-token style context (tone/format/detail/confidence + fallback note).
- `learn_from_turn`: short applied-now summary including `sessionsRetained`, personalization %, budget remaining, and rank label.
  - duplicate `turnId` calls are ignored for retry-safe idempotency.

## Local persistence

FedLearn persists adapter state using the existing `fedlearn-core` Node persistence:
- by default: a `./.fedlearn-local-adapters.json` file relative to the process working directory
- optionally override via `FEDLEARN_LOCAL_STORE`

## Supported MCP clients

This repo currently targets Cursor, Claude Desktop, and AntiGravity.
Configure your client to run this server as a stdio tool process and call:
`pre_turn` then `get_personalization_context` before drafting, and `learn_from_turn` after final answer.

For deterministic "every turn updates" behavior, route all turns through `@viyrockan/fedlearn-orchestrator` in your host integration.

## Token budget note

This package intentionally returns compact context to keep overhead moderate.
If confidence is low, context instructs neutral fallback instead of forcing aggressive style steering.

