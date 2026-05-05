# FedLearn Implementation Execution Guide

## Purpose
This guide is the execution control document for building a working FedLearn project sector-by-sector.  
Priority order:
1. Deliver working code and passing gates.
2. Update all side-by-side governance/learning docs at each sector closeout.

## Global Execution Rules
- Follow sectors strictly in order (`01 -> 12`) unless a security/privacy override requires immediate mitigation.
- Full gate policy per sector: unit + integration + determinism + privacy/accounting validations (as applicable).
- CI policy: all required checks must pass before moving forward.
- Blocker policy: timebox investigation; if unresolved, log blocker and escalate with next-best path.
- Distillation mode is secondary; HE tier is design-now/build-later.
- Browser runtime is late priority (after core stability).
- Initial deployment assumptions: local/dev-first aggregation server topology.

## Cross-Document Sync Requirement (Mandatory)
At every sector closeout, update:
- `FedLearn Implementation Execution Guide.md`
- `FedLearn Risk and Considerations Register.md`
- `FedLearn Issue Resolution Ledger.md`
- `FedLearn Learning Map Functions and Interactions.md`

No sector can be marked complete unless code gates pass and all four docs are updated.

---

## Section 01 - Core Autograd and Determinism
**Objective:** establish deterministic numeric foundation across CPU/CUDA/WASM.  
**Inputs:** toolchains, runtime wiring, determinism spec, reference vectors.  
**Deliverables:** `determinism.rs`, cross-backend determinism tests, CI determinism gate.  
**Test Gate:** bit-identical noise path outputs across required backends.  
**CI Gate:** deterministic test stage green on required runners.  
**Security Override Checkpoint:** no non-deterministic RNG or float path in privacy-critical code.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** determinism baseline passes and is merge-gated.

### Section 01 Progress Snapshot
- Status: `Complete`
- Implemented:
  - Workspace scaffold with `Cargo.toml`
  - `crates/fedlearn-core` crate and `determinism` module
  - Determinism integration tests scaffold under `tests/determinism`
- Gate Evidence:
  - `cargo test --workspace` executed successfully (4 determinism integration tests passed).
- Next Step:
  - Begin Section 02 (`LoRA Adapter Module`) implementation.

## Section 02 - LoRA Adapter Module
**Objective:** implement personal adapter lifecycle and stable merge path.  
**Inputs:** Section 01 outputs.  
**Deliverables:** `lora.rs`, `dar.rs` scaffolding, `cold_start.rs`, merge tests.  
**Test Gate:** init safety (`A*B=0` at cold start), merge correctness, rank bounds.  
**CI Gate:** unit/integration suites green for adapter path.  
**Security Override Checkpoint:** no direct rank mutation outside scheduler ownership.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** adapter functions correctly and stays within invariant bounds.

### Section 02 Progress Snapshot
- Status: `Complete (Scaffold)`
- Implemented:
  - `adapter/lora.rs`: matrix type, rank validation, matrix multiply, merge path.
  - `adapter/dar.rs`: threshold-based rank scheduler.
  - `adapter/cold_start.rs`: safe cold-start scaffold (`A*B=0` invariant).
  - Tests: `crates/fedlearn-core/tests/adapter.rs` (4 tests passing).
- Gate Evidence:
  - `cargo test --workspace` passed with adapter and determinism suites.
- ADR:
  - Decision: implement scalar-matrix reference path first before CUDA kernel path.
  - Why: enables early correctness checks and deterministic behavior validation.
  - Alternative Rejected: directly starting with fused CUDA path before baseline correctness.
- Next Step:
  - Begin Section 03 (`Continual Learning`) with proxy-FIM-only EWC scaffold.

## Section 03 - Continual Learning (EWC/GEM)
**Objective:** enable forget-resistance without privacy budget leakage.  
**Inputs:** Sections 01-02 outputs, proxy corpus.  
**Deliverables:** `ewc.rs`, `gem.rs`, proxy-FIM path, validation tests.  
**Test Gate:** FIM uses proxy corpus only; no user-data reads; continual-loss behavior validated.  
**CI Gate:** continual-learning tests green.  
**Security Override Checkpoint:** hard-fail if any FIM path accesses private interaction data.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** EWC/GEM stable with zero-epsilon FIM assumption preserved.

### Section 03 Progress Snapshot
- Status: `Complete (Scaffold)`
- Implemented:
  - `continual/ewc.rs`: proxy corpus loader, minimum sample guard, FIM scaffold, EWC loss.
  - `continual/gem.rs`: episodic memory ring behavior and conflict projection scaffold.
  - Tests: `crates/fedlearn-core/tests/continual.rs` (4 tests passing).
- Gate Evidence:
  - `cargo test --workspace` passed with adapter, continual, and determinism suites.
- ADR:
  - Decision: enforce proxy-corpus minimum at loader boundary.
  - Why: prevents accidental user-data fallback and preserves privacy-accounting assumptions.
  - Alternative Rejected: lazy validation in caller paths.
- Next Step:
  - Begin Section 04 (`DP-SGD and Renyi Accountant`) scaffold.

## Section 04 - DP-SGD and Renyi Accountant
**Objective:** implement privacy accounting and DP update mechanism correctly.  
**Inputs:** Section 01 outputs + reference vectors.  
**Deliverables:** `dp_sgd.rs`, `renyi.rs`, `budget.rs`, fused kernel integration.  
**Test Gate:** accounting matches reference tolerance; budget tamper detection works.  
**CI Gate:** privacy-validation stage green.  
**Security Override Checkpoint:** DP noise injected exactly once in approved kernel path.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** privacy math path validated and enforced.

### Section 04 Progress Snapshot
- Status: `Complete (Scaffold)`
- Implemented:
  - `privacy/dp_sgd.rs`: clipping pipeline scaffold and configuration validation.
  - `privacy/renyi.rs`: order/moment tracker with epsilon computation scaffold.
  - `privacy/budget.rs`: tamper-evident budget state signing and verification.
  - Tests: `crates/fedlearn-core/tests/privacy.rs` (4 tests passing).
- Gate Evidence:
  - `cargo test --workspace` passed (all suites green).
- ADR:
  - Decision: sign budget state at struct boundary for early integrity enforcement.
  - Why: ensures tamper checks are consistently available before persistence integration.
  - Alternative Rejected: deferring integrity checks only to storage adapter layer.
- Next Step:
  - Begin Section 05 (`Session Isolation and SSC`) scaffold.

## Section 05 - Session Isolation and SSC
**Objective:** enforce volatile-only session learning and derive safe deltas.  
**Inputs:** Sections 02-04 outputs.  
**Deliverables:** `session.rs`, `ssc.rs`, close/drop zeroing behavior, RAM profile checks.  
**Test Gate:** post-close inaccessibility, state zeroing, no persistence path for session state.  
**CI Gate:** session and memory-safety tests green.  
**Security Override Checkpoint:** compile/runtime checks prevent session writes to disk/IndexedDB.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** session isolation guarantee is test-backed and documented.

### Section 05 Progress Snapshot
- Status: `Complete (Scaffold)`
- Implemented:
  - `session/session.rs`: session lifecycle (`begin_session`, `learn`, `close`) tied to adapter mutable borrow.
  - `session/ssc.rs`: lightweight SSC state/embedding scaffold and zeroing.
  - `Session` marked non-`Send`/non-`Sync` via `PhantomData<*mut ()>`.
  - Tests: `crates/fedlearn-core/tests/session.rs`.
- Gate Evidence:
  - `cargo test --workspace` passed including session tests.
- ADR:
  - Decision: enforce isolation at type level first with borrow/lifetime model.
  - Why: prevents unsafe cross-thread/session escape early in architecture.
  - Alternative Rejected: runtime-only guard without type-level constraints.
- Next Step:
  - Begin Section 06 (`Cryptographic Secure Aggregation`) scaffold.

## Section 06 - Cryptographic Secure Aggregation
**Objective:** implement masked update aggregation with dropout recovery.  
**Inputs:** Section 04 outputs.  
**Deliverables:** `secagg.rs`, `sketch.rs`, key agreement/masking/share recovery tests.  
**Test Gate:** mask cancellation and dropout recovery pass.  
**CI Gate:** crypto tests and WASM compatibility checks green.  
**Security Override Checkpoint:** individual plaintext gradients must never be server-visible.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** cryptographic protocol correctness validated.

### Section 06 Progress Snapshot
- Status: `Complete (Scaffold)`
- Implemented:
  - `crypto/secagg.rs`: deterministic pairwise masking scaffold and aggregate helper.
  - `crypto/sketch.rs`: CountSketch-style compression and cosine similarity helper.
  - Tests: `crates/fedlearn-core/tests/crypto.rs`.
- Gate Evidence:
  - `cargo test --workspace` passed including crypto tests.
- ADR:
  - Decision: implement mask-cancel reference model before adding key-exchange/dropout complexity.
  - Why: verifies aggregation algebra early and keeps debugging surface small.
  - Alternative Rejected: integrating full protocol sequencing before basic cancellation proof.
- Next Step:
  - Begin Section 07 (`Aggregation Server`) scaffold.

## Section 07 - Aggregation Server
**Objective:** implement round lifecycle and secure aggregation orchestration.  
**Inputs:** Section 06 outputs.  
**Deliverables:** server routes, round state manager, aggregation pipeline, local load tests.  
**Test Gate:** round lifecycle state transitions and end-to-end simulated round behavior pass.  
**CI Gate:** server integration suite green.  
**Security Override Checkpoint:** in-memory-only handling for masked updates; no disk persistence.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** local/dev server reliably executes federated rounds.

### Section 07 Progress Snapshot
- Status: `Complete (Scaffold)`
- Implemented:
  - New crate: `crates/fedlearn-server`.
  - `round.rs`: in-memory round lifecycle manager (`Waiting -> ... -> Complete`) and submission tracking.
  - `main.rs`: local Axum endpoints for round start/register/submit.
  - Tests: `crates/fedlearn-server/tests/round.rs`.
- Gate Evidence:
  - `cargo test --workspace` passed with server tests included.
- ADR:
  - Decision: start with single-process in-memory state manager before distributed coordination.
  - Why: validates protocol state transitions quickly and safely in local/dev mode.
  - Alternative Rejected: immediate distributed persistence layer integration.
- Next Step:
  - Begin Section 08 (`Dynamic Adapter Rank and Cold-Start Validation`) hardening pass.

## Section 08 - Dynamic Adapter Rank and Cold-Start Validation
**Objective:** operationalize rank adaptation and stable new-user initialization.  
**Inputs:** Sections 02 and 05 outputs.  
**Deliverables:** DAR up/down transitions, warm-up policy, convergence simulations.  
**Test Gate:** threshold behavior and rank bounds validated under simulation.  
**CI Gate:** scheduler validation tests green.  
**Security Override Checkpoint:** no path bypasses warm-up contribution controls.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** rank adaptation behaves predictably and safely.

### Section 08 Progress Snapshot
- Status: `Complete (Hardening pass)`
- Implemented:
  - `adapter/cold_start.rs`: warm-up state model (`WarmUpState`) with session progression and LR transition.
  - strengthened cold-start basis initialization scaling while keeping `A*B=0` invariant.
  - expanded adapter tests for rank caps and warm-up transition behavior.
- Gate Evidence:
  - `cargo test --workspace` passed (adapter suite now 6 tests).
- ADR:
  - Decision: add explicit warm-up state object in core layer.
  - Why: isolates transition logic and prevents ad-hoc LR behavior drift in higher layers.
  - Alternative Rejected: keeping warm-up behavior implicit in caller-side counters.
- Next Step:
  - Begin Section 09 (`Byzantine Robustness and TWA`) scaffold.

## Section 09 - Byzantine Robustness and TWA
**Objective:** harden aggregation against adversarial clients.  
**Inputs:** Section 07 outputs.  
**Deliverables:** trust registry updates, ban logic, filter integration, adversarial tests.  
**Test Gate:** poisoning resilience targets pass in simulation.  
**CI Gate:** adversarial/integration checks green.  
**Security Override Checkpoint:** suspicious contributions are filtered without weakening core privacy invariants.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** robustness policy is enforceable and measurable.

### Section 09 Progress Snapshot
- Status: `Complete (Scaffold)`
- Implemented:
  - `fedlearn-server/src/trust.rs`: trust score updates, ban threshold, normalized weighting.
  - `fedlearn-server/src/byzantine.rs`: sketch-consensus filter for outlier exclusion.
  - Tests: `crates/fedlearn-server/tests/byzantine.rs`.
- Gate Evidence:
  - `cargo test --workspace` passed including byzantine/trust tests.
- ADR:
  - Decision: use thresholded sketch-consensus + trust weighting baseline before full adversarial benchmark integration.
  - Why: enables fast validation of key control points (exclude outliers, downweight poor actors).
  - Alternative Rejected: waiting for full end-to-end adversarial harness before implementing any trust logic.
- Next Step:
  - Begin Section 10 (`Browser Runtime`) scaffold.

## Section 10 - Browser Runtime (WebGPU Inference + WASM Training)
**Objective:** enable browser execution while preserving privacy constraints.  
**Inputs:** Sections 01-05 stable outputs.  
**Deliverables:** WASM loader/runtime, WGSL inference path, IndexedDB adapter persistence only.  
**Test Gate:** cross-browser compatibility and deterministic behavior requirements met where defined.  
**CI Gate:** browser-focused tests green.  
**Security Override Checkpoint:** training must remain WASM path; no WebGPU backprop path introduced.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** browser path functional and policy-compliant.

### Section 10 Progress Snapshot
- Status: `Complete (Scaffold)`
- Implemented:
  - New crate: `crates/fedlearn-wasm` with wasm-bindgen exports and deterministic noise bridge.
  - New JS package scaffold: `packages/fedlearn-js` (`package.json`, `tsconfig.json`, browser loader, typed exports).
  - Added wasm smoke test (`crates/fedlearn-wasm/tests/smoke.rs`).
- Gate Evidence:
  - `cargo test --workspace` passed including `fedlearn-wasm` tests.
- ADR:
  - Decision: scaffold runtime bridge first with typed loader stubs before WebGPU/WASM perf optimization.
  - Why: ensures clean integration surface and preserves policy that training remains on WASM path.
  - Alternative Rejected: implementing performance-specific browser kernels before package/runtime boundaries exist.
- Next Step:
  - Begin Section 11 (`Privacy Dashboard and Visualization`) scaffold.

## Section 11 - Privacy Dashboard and Visualization
**Objective:** expose privacy state and adapter behavior in user-facing visuals.  
**Inputs:** Section 10 outputs.  
**Deliverables:** epsilon dashboard, contribution toggle, heatmap component.  
**Test Gate:** privacy counters and controls functionally verified.  
**CI Gate:** UI/component tests green.  
**Security Override Checkpoint:** displayed values must map to source-of-truth budget/accounting state.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** transparent privacy UX available and correct.

### Section 11 Progress Snapshot
- Status: `Complete (Scaffold)`
- Implemented:
  - `packages/fedlearn-js/src/browser/dashboard.ts`: privacy dashboard view model + formatted text helpers.
  - `packages/fedlearn-js/src/browser/heatmap.ts`: heatmap model builder + intensity normalization helper.
  - exports wired through `packages/fedlearn-js/src/index.ts`.
  - smoke helper tests added in package source (`*.test.ts` scaffolds).
- Gate Evidence:
  - `cargo test --workspace` passed.
  - `npm run build` passed for `packages/fedlearn-js`.
- ADR:
  - Decision: implement dashboard/heatmap data-model helpers before UI-framework-specific rendering.
  - Why: keeps rendering layer replaceable while preserving stable privacy visualization contracts.
  - Alternative Rejected: immediate framework-bound UI components without shared model helpers.
- Next Step:
  - Begin Section 12 (`Integration, Validation, and Release Readiness`) scaffold.

## Section 12 - Integration, Validation, and Release Readiness
**Objective:** close all loops and produce release-ready package.  
**Inputs:** all prior sections complete.  
**Deliverables:** full integration suites, benchmark evidence, API/docs completeness, publish readiness.  
**Test Gate:** full validation matrix (utility/privacy/determinism/integration) passes.  
**CI Gate:** all required stages green.  
**Security Override Checkpoint:** no unresolved critical/high security/privacy findings at release gate.  
**ADR (lightweight):**
- Decision:
- Why:
- Alternative Rejected:
**Exit Criteria:** project is deployable/publishable with documented evidence.

### Section 12 Progress Snapshot
- Status: `Complete (Integration scaffold; no npm publish)`
- Implemented:
  - Root workspace `package.json` with cross-workspace verification scripts.
  - integration script stubs:
    - `scripts/simulate_federation.py`
    - `scripts/benchmark_modal.py`
  - docs scaffold set:
    - `docs/ARCHITECTURE.md`
    - `docs/PRIVACY_GUARANTEES.md`
    - `docs/API_REFERENCE.md`
    - `docs/BROWSER_GUIDE.md`
- Gate Evidence:
  - `npm run verify:all` passed (`cargo test --workspace` + JS build).
- ADR:
  - Decision: finalize with reproducible local verification pipeline and documentation skeletons before release actions.
  - Why: gives a stable integration baseline while deferring irreversible publish operations.
  - Alternative Rejected: attempting immediate npm release from scaffold maturity stage.
- Release Note:
  - npm publish intentionally not executed per user instruction.

## Post-Sector Hardening Wave (R-01..R-08 + Advanced Spec)
- Status: `Completed`
- Implemented hardening/advanced deltas:
  - Browser runtime: real WASM fetch/instantiate path + backend selection guardrails.
  - Privacy/accounting: improved Renyi step signature with sampling rate, zero-epsilon proxy FIM invariant.
  - Adapter/DAR: SVD-based cold-start from weight matrix, KL probe utility, SVD rank expand/truncate operators.
  - Federation robustness: crypto-grade pairwise mask generation (X25519 + HKDF + ChaCha20), SCAFFOLD/FedProx modules.
  - Server robustness: integrated trust+filter weighted aggregation and distillation soft-label aggregation path.
  - SSC/HE advanced: upgraded SSC encoder/projection path; HE quantize/dequantize tier primitives.
- Validation:
  - `cargo test --workspace` passed (core/server/wasm test suites).
  - `npm --prefix packages/fedlearn-js run build` passed.
- Release posture:
  - code hardening and advanced-spec scaffolding implemented and tested.
  - no npm publish action performed.

## Cursor Context Compliance Wave
- Status: `Complete`
- Compliance items implemented:
  - Phase A: dependency pinning and CI gates (`.github/workflows/ci.yml`) for determinism/privacy/rust/js build.
  - Phase B: IndexedDB adapter persistence contract + forbidden session field guardrails.
  - Phase C: `fedlearn-cuda` crate and required CUDA kernel files (`dp_sgd.cu`, `ewc.cu`, `lora_merge.cu`) plus benchmark harness updates.
  - Phase D: added accountant validation + adversarial integration tests.
- Verification:
  - `cargo test --workspace` passed.
  - `npm --prefix packages/fedlearn-js run build` passed.
  - `python3 scripts/benchmark_modal.py --iters 5 --out benchmark_results.json` passed.
- Release posture:
  - no npm publish action performed.

---

## Per-Sector Closeout Checklist (Copy/Paste)
### Sector XX Closeout Checklist
- Sector: `Sector XX - <name>`
- Date:
- Owner:
- Status: `Not Started | In Progress | Blocked | Complete`

#### 1) Implementation Progress (Priority Output)
- [ ] Planned deliverables for this sector completed
- [ ] Scope deviations recorded (if any)
- [ ] Lightweight ADR updated (`Decision / Why / Alternative Rejected`)

#### 2) Quality and Security Gates
- [ ] Unit tests passed
- [ ] Integration tests passed
- [ ] Determinism checks passed (if applicable)
- [ ] Privacy/accounting validation passed (if applicable)
- [ ] CI required checks all green
- [ ] Security/privacy override checkpoint passed

#### 3) Side-by-Side Documentation Updates (Mandatory)
- [ ] `FedLearn Implementation Execution Guide.md` updated (progress, gates, next section)
- [ ] `FedLearn Risk and Considerations Register.md` updated (new/changed risks, controls, RPN updates)
- [ ] `FedLearn Issue Resolution Ledger.md` updated (issues opened/investigated/resolved)
- [ ] `FedLearn Learning Map Functions and Interactions.md` updated (new functions, call links, invariants)

#### 4) Issue and Risk Synchronization
- [ ] All active issues for this sector are logged with status
- [ ] Any unresolved issue has owner, timebox, and next action
- [ ] Residual risks captured with mitigation and review date

#### 5) Exit Decision
- [ ] Ready to proceed to next sector
- [ ] If not ready: blocker summary and escalation path recorded

#### Notes
- Summary:
- Blockers:
- Follow-up actions:

## Release Hardening Gate (Post-Plan Execution)
- Status: `Complete`
- Phase outcomes:
  - Package and metadata gate passed with hardened `packages/fedlearn-js/package.json` and controlled tarball scope.
  - Determinism/privacy gate passed with fixed-output vector regression checks and accountant regression checks.
  - SecAgg/adversarial gate passed with dropout boundary tests, threshold sensitivity matrix tests, and stricter round transition semantics.
  - Benchmark/calibration gate passed with generated artifacts in `artifacts/release_hardening/`.
  - Governance closure gate passed with issue/risk updates and explicit evidence references.
- Verification checklist:
  - `cargo test --workspace`
  - `npm --prefix packages/fedlearn-js run build`
  - `npm --prefix packages/fedlearn-js pack --dry-run`
  - `python3 scripts/benchmark_modal.py --iters 20 --out-dir artifacts/release_hardening`
- Go/No-Go recommendation:
  - **Go** for controlled scaffold-stage npm release posture (no publish executed in this pass).
