# @viyrockan/fedlearn-adapter

On-device LoRA adapter (on the order of ~150KB for default `d_model` / `rank`) with Elastic Weight Consolidation (EWC) for mitigating catastrophic forgetting. **No Rust toolchain is required** to install the npm package: native binaries ship for supported platforms.

## Install

```bash
npm install @viyrockan/fedlearn-adapter
```

Requires **Node.js 20+**.

## Quick start

```javascript
import { FedLearnAdapter } from "@viyrockan/fedlearn-adapter";
import { writeFileSync, readFileSync } from "node:fs";

const adapter = new FedLearnAdapter();

const inputEmbedding = new Float32Array(512).fill(0.1);
const targetEmbedding = new Float32Array(512).fill(0.5);

// Session 1 — learn from turns
await adapter.learnTurn(inputEmbedding, targetEmbedding);
adapter.consolidate();

// Session 2 — EWC regularizes toward session-1 weights (Fisher is in the checkpoint)
await adapter.learnTurn(inputEmbedding, targetEmbedding);

// Save to disk
writeFileSync(".fedlearn/adapter.bin", adapter.serialize());

// Load and continue
const loaded = FedLearnAdapter.deserialize(readFileSync(".fedlearn/adapter.bin"));
```

## API (TypeScript)

| Method / property | Description |
|-------------------|-------------|
| `new FedLearnAdapter(config?)` | Construct adapter; see config table below. |
| `learnTurn(input, target)` | One training step on embedding vectors (same length `d_model`). |
| `consolidate()` | End of session: consolidate empirical Fisher diagonal and θ\* for EWC. |
| `forward(input, layer)` | Inference forward for one LoRA layer index (no training). |
| `serialize()` | `Buffer` checkpoint (magic `FLA\0`, weights, optional JSON `EwcState`). |
| `FedLearnAdapter.deserialize(buf, { learningRate? })` | Restore from checkpoint (`learningRate` required for fresh optimizer). |
| `turnCount` | Turns since last `consolidate`. |
| `layerCount` / `dModel` | Architecture readout. |

## Config (`AdapterConfig`)

| Field | Default | Description |
|-------|---------|-------------|
| `dModel` | `512` | Embedding dimension (input/target length). |
| `numLayers` | `8` | Independent LoRA stacks (mean MSE across layers in training). |
| `rank` | `4` | LoRA rank (smaller ≈ fewer bytes on disk). |
| `alpha` | `4.0` | LoRA scaling vs rank. |
| `ewcLambda` | `400` | EWC strength λ on the quadratic penalty. |
| `learningRate` | `0.001` | SGD learning rate for trainable LoRA matrices. |

## How it works

**LoRA:** Each layer stores trainable low-rank matrices `A` (`d_model × rank`) and `B` (`rank × d_model`). The adapter output is `x @ A @ B` scaled by `α / rank`. Storing only `A` and `B` keeps the serialized checkpoint small compared to full fine-tuning.

**EWC:** After each session, squared gradients are aggregated to estimate a diagonal Fisher importance. At consolidation, current weights become θ\* and the Fisher values are stored. In later sessions, the loss adds `(λ/2) Σ F_i (θ_i − θ\*_i)²`, so updates that would erase important weights are penalized.

## Embedding contract

This package operates **in embedding space**. The host (MCP server, CLI, or your app) must supply `Float32Array` / arrays of length `d_model`. **No base LLM or tokenizer is bundled.**

## Platforms

| Item | Support |
|------|---------|
| Node.js | 20+ |
| Prebuilt targets | macOS arm64, Linux x64 (glibc), Windows x64 MSVC (via optional npm platform packages) |
| Browser | **Not supported** — this is an napi-rs native addon. For browser/WASM, see the separate `fedlearn-wasm` crate in the monorepo. |

## Implementation note

Rust dependencies use **Candle `0.10.2`** from crates.io (aligned `candle-core` / `candle-nn`). Candle `0.6.0` did not resolve cleanly with the current `rand` / `half` graph; the implementation follows the same LoRA + EWC design as the original plan.

## CI

GitHub Actions workflow for multi-platform builds lives at [`.github/workflows/publish.yml`](.github/workflows/publish.yml). GitHub only executes workflows under the **repository root** `.github/workflows/`; if this file is nested under `packages/`, copy or symlink it to the root to enable automation.

## License

MIT
