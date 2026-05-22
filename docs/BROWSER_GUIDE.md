# Browser Guide

## Package
`fedlearn-core` (workspace package at `packages/fedlearn-js`)

## Basic Usage
```ts
import { initWasm, wasmHealthCheck } from "fedlearn-core";

await initWasm({ wasmUrl: "/fedlearn_wasm_bg.wasm" });
console.log(wasmHealthCheck());
```

## WASM Asset Requirements
- Place the compiled wasm binary at the URL passed to `initWasm` (default: `/fedlearn_wasm_bg.wasm`).
- `initWasm` validates the binary magic header and reports explicit errors for invalid bytes.
- Use `wasmHealthCheck()` to inspect:
  - `initialized`
  - `wasmBytesLength`
  - `lastError`
  - `lastWasmUrl`

## Privacy/Storage Notes
- Adapter records are persisted in IndexedDB (`fedlearn` database, `adapters` store).
- Session-only fields are blocked from persistence by guardrails.

## End-to-End Verification Runbook
1. CLI dashboard check:
   - `npx fedlearn-core`
2. CLI JSON health:
   - `npx fedlearn-core health`
3. Local-memory + no-network verification:
   - `npx fedlearn-core verify-local`
   - Expect output with `"ok": true` and `"networkEgressDetected": false`.
4. Persistent terminal dashboard:
   - `npx @viyrockan/fedlearn-ui`
   - Runs continuously and refreshes until `Ctrl+C`.
5. Browser persistence proof:
   - Run browser app and confirm console save/load logs.
   - Inspect IndexedDB: `fedlearn` -> `adapters`.

For the validation runbook (tests, demo, scripts, CLI checks),
refer to `docs/VALIDATION_RUNBOOK.md`.

