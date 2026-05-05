# FedLearn API Reference

## TypeScript Entry Exports
From `packages/fedlearn-js/src/index.ts`:
- `initWasm`
- `wasmHealthCheck`
- `buildPrivacyDashboardText`
- `formatEpsilon`
- `pauseContributions`
- `resumeContributions`
- `toggleContributions`
- `buildHeatMapModel`
- `normalizeIntensity`
- `LocalAdapter`
- `LocalSession`
- `verifyLocalDataFlow`
- `openAdapterDb`
- `saveAdapterRecord`
- `loadAdapterRecord`

### Explainer-Aligned Facade
```ts
import { LocalAdapter } from "fedlearn-core";

const adapter = await LocalAdapter.load("user-id");
const session = adapter.beginSession();
await session.learn([{ input: "prompt", output: "reply", loss: 0.2 }]);
await adapter.apply(await session.close());
```

### Memory Verification
```ts
import { LocalAdapter, verifyLocalDataFlow } from "fedlearn-core";

const adapter = await LocalAdapter.load("memory-user");
const before = adapter.snapshot().sessionCount;
const session = adapter.beginSession("memory-proof");
await session.learn([{ input: "x", output: "y", loss: 0.1 }]);
await adapter.apply(await session.close());
const after = (await LocalAdapter.load("memory-user")).snapshot().sessionCount;
console.log({ before, after }); // expect after = before + 1

console.log(await verifyLocalDataFlow("verify-local-user"));
```

## CLI Commands
- `npx fedlearn-core` -> default terminal dashboard.
- `npx fedlearn-core health` -> JSON health payload.
- `npx fedlearn-core verify-local` -> local-flow verification report (`ok` must be `true`).
- `npx fedlearn-ui` -> persistent terminal dashboard loop until interrupted.

## Rust Crate Public Modules
From `crates/fedlearn-core/src/lib.rs`:
- `determinism`
- `adapter`
- `continual`
- `privacy`
- `session`
- `crypto`

