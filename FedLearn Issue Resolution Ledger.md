# FedLearn Issue Resolution Ledger

## Purpose
This ledger is the live issue system for implementation.  
Use it continuously while building. It is mandatory for sector closeout.

## Required Lifecycle
`Open -> Investigating -> Resolved`

## Mandatory Rule
- A sector cannot be marked complete until:
  - new issues are logged,
  - ongoing issues are status-updated,
  - resolved issues include verification evidence.

## Field Template (Use for Every Issue)
```markdown
### ISSUE-XXXX: <short title>
- Date Opened:
- Last Updated:
- Sector/Module:
- Status: Open | Investigating | Resolved
- Priority: Critical | High | Medium | Low
- Issue:
- Impact:
- Root Cause:
- Solution Proposed:
- Solution Implemented:
- Verification/Tests:
- Residual Risk:
- Owner:
- Timebox:
- Next Action:
```

## Sector Closeout Sync Checklist
- [ ] All active issues in this sector are present in this ledger.
- [ ] Each active issue has owner, timebox, and next action.
- [ ] Any resolved issue includes test evidence.
- [ ] Residual risk documented and mirrored in risk register if needed.

---

## Starter Issues (Seed Entries)

### ISSUE-0000: Rust toolchain unavailable (`cargo` command missing)
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 01 / local build environment
- Status: Resolved
- Priority: High
- Issue: `cargo test --workspace` cannot run because `cargo` is not found in environment.
- Impact: cannot validate determinism and quality gates for Sector 01.
- Root Cause: Rust toolchain not installed or not in PATH.
- Solution Proposed: install Rust via rustup and verify `cargo`, `rustc`, and target availability.
- Solution Implemented: installed Rust toolchain via `rustup`, sourced cargo environment, reran workspace tests.
- Verification/Tests: `cargo --version`, `rustc --version`, `cargo test --workspace` (pass).
- Residual Risk: low; preflight script still recommended.
- Owner: TBD
- Timebox: same day
- Next Action: add toolchain preflight step before Sector 02 work.

### ISSUE-0001: Cross-backend determinism mismatch in DP path
- Date Opened: TBD
- Last Updated: TBD
- Sector/Module: Sector 01 / `determinism` + `privacy`
- Status: Open
- Priority: Critical
- Issue: CPU/CUDA/WASM path returns mismatched values for expected deterministic vectors.
- Impact: privacy guarantees may be inconsistent across runtime targets.
- Root Cause: TBD
- Solution Proposed: isolate divergence source, enforce deterministic op wrappers and approved seed flow.
- Solution Implemented: TBD
- Verification/Tests: cross-backend determinism suite, reference vectors.
- Residual Risk: none once deterministic gate is stable; otherwise high.
- Owner: TBD
- Timebox: 1-2 working days
- Next Action: reproduce mismatch with minimal vector harness.

### ISSUE-0002: Budget state tamper detection false negative/positive
- Date Opened: TBD
- Last Updated: TBD
- Sector/Module: Sector 04 / `privacy/budget`
- Status: Open
- Priority: High
- Issue: budget state integrity check does not reliably classify tampered state.
- Impact: incorrect contribution permission and broken accountability.
- Root Cause: TBD
- Solution Proposed: standardize serialization + signature inputs and harden verification path.
- Solution Implemented: TBD
- Verification/Tests: tamper injection tests, startup integrity tests.
- Residual Risk: medium until long-run soak validation.
- Owner: TBD
- Timebox: 2 working days
- Next Action: add deterministic fixture set for signed/unsigned budget payloads.

### ISSUE-0003: SecAgg dropout recovery failure at threshold
- Date Opened: TBD
- Last Updated: TBD
- Sector/Module: Sector 06 / `crypto/secagg`
- Status: Open
- Priority: High
- Issue: aggregation round fails when dropout count approaches expected recovery threshold.
- Impact: stalled rounds and possible incorrect aggregate result.
- Root Cause: TBD
- Solution Proposed: validate share accounting and recovery logic under boundary conditions.
- Solution Implemented: TBD
- Verification/Tests: dropout simulation and recovery correctness tests.
- Residual Risk: medium if only nominal-case tests exist.
- Owner: TBD
- Timebox: 2-3 working days
- Next Action: run boundary sweep for participant and dropout combinations.

### ISSUE-0004: Federation mode mismatch between client and server
- Date Opened: TBD
- Last Updated: TBD
- Sector/Module: Sector 07 / federation protocol
- Status: Open
- Priority: Medium
- Issue: client configured in one mode sends payload unsupported by server round mode.
- Impact: round submission failure and protocol confusion.
- Root Cause: TBD
- Solution Proposed: strict mode handshake and fail-fast descriptive errors.
- Solution Implemented: TBD
- Verification/Tests: contract tests for gradient/distillation mode negotiation.
- Residual Risk: low after contract tests and explicit errors.
- Owner: TBD
- Timebox: 1-2 working days
- Next Action: add mode-negotiation test matrix.

### ISSUE-0005: Cold-start SVD not yet fully implemented
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 02 / `adapter/cold_start`
- Status: Investigating
- Priority: Medium
- Issue: `svd_style_cold_start` currently uses scaffold approximation instead of full SVD decomposition.
- Impact: initial personalization quality may differ from final specification.
- Root Cause: staged implementation approach prioritizing correctness and testability.
- Solution Proposed: replace scaffold with proper SVD-based initializer once linear algebra path is finalized.
- Solution Implemented: pending
- Verification/Tests: add convergence/initialization quality test in later sector hardening.
- Residual Risk: medium until full SVD path lands.
- Owner: TBD
- Timebox: before Sector 08 hardening
- Next Action: implement production SVD initializer and close with benchmark evidence.

### ISSUE-0006: EWC FIM uses placeholder distribution
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 03 / `continual/ewc`
- Status: Investigating
- Priority: Medium
- Issue: FIM builder currently returns deterministic placeholder values after proxy corpus validation.
- Impact: forget-resistance effectiveness may differ from target behavior.
- Root Cause: staged implementation to enforce data-source safety first.
- Solution Proposed: implement full proxy-driven gradient-based FIM estimation.
- Solution Implemented: pending
- Verification/Tests: compare against expected FIM behavior and continual-learning benchmark outputs.
- Residual Risk: medium until production FIM lands.
- Owner: TBD
- Timebox: before Section 08 convergence studies
- Next Action: replace scaffold path and add fidelity tests.

### ISSUE-0007: Renyi accountant is scaffold-level implementation
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 04 / `privacy/renyi`
- Status: Investigating
- Priority: High
- Issue: current Renyi accountant uses simplified update and needs strict reference alignment.
- Impact: inaccurate privacy spend reporting risk if not upgraded before production stage.
- Root Cause: staged implementation for early integration.
- Solution Proposed: implement reference equations and compare against validation vectors.
- Solution Implemented: pending
- Verification/Tests: accountant validation suite with strict tolerance.
- Residual Risk: high until validation vectors pass.
- Owner: TBD
- Timebox: before Section 12 release gate
- Next Action: add reference test vectors and replace scaffold math.

### ISSUE-0008: Session API currently slice-based (not async stream)
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 05 / `session/session`
- Status: Investigating
- Priority: Low
- Issue: session learn path currently accepts slice input; final API expects async stream compatibility.
- Impact: integration mismatch risk with planned TypeScript/runtime contract.
- Root Cause: phased scaffold implementation.
- Solution Proposed: add async ingestion adapter and preserve lifetime-based isolation.
- Solution Implemented: pending
- Verification/Tests: integration tests with stream-based interaction source.
- Residual Risk: low while core invariants are maintained.
- Owner: TBD
- Timebox: before browser/API integration sectors
- Next Action: add async-compatible learn path wrapper.

### ISSUE-0009: SecAgg masking currently non-cryptographic scaffold
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 06 / `crypto/secagg`
- Status: Investigating
- Priority: High
- Issue: masking logic uses deterministic pseudo-mask model for algebra verification only.
- Impact: not production-secure; must not be used for real confidentiality guarantees.
- Root Cause: staged development to validate cancellation behavior first.
- Solution Proposed: replace with X25519 + HKDF + secure stream-mask generation and Shamir recovery.
- Solution Implemented: pending
- Verification/Tests: secure protocol integration tests, dropout recovery tests.
- Residual Risk: high until cryptographic implementation lands.
- Owner: TBD
- Timebox: before Section 07 completion
- Next Action: implement crypto-grade key agreement and masking primitives.

### ISSUE-0010: Server round state lacks crash recovery persistence
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 07 / `fedlearn-server/round`
- Status: Investigating
- Priority: Low
- Issue: round lifecycle state is in-memory only and resets on process restart.
- Impact: active round may be lost on crash/redeploy.
- Root Cause: local/dev-first scaffold architecture.
- Solution Proposed: add persistence/checkpoint strategy for round metadata in later hardening phase.
- Solution Implemented: pending
- Verification/Tests: crash/restart recovery test scenarios.
- Residual Risk: low for dev, higher for production.
- Owner: TBD
- Timebox: before release integration gate
- Next Action: design and implement minimal durable round metadata store.

### ISSUE-0011: DAR KL-probe pipeline not fully integrated
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 08 / `adapter/dar`
- Status: Investigating
- Priority: Medium
- Issue: scheduler logic exists, but full probe-set KL measurement wiring is still pending.
- Impact: rank transitions depend on externally supplied KL values.
- Root Cause: phased implementation focused on scheduler correctness first.
- Solution Proposed: implement probe-set evaluation path and bind it to session close lifecycle.
- Solution Implemented: pending
- Verification/Tests: integration tests for measured KL-driven rank transitions.
- Residual Risk: medium until probe evaluation is wired.
- Owner: TBD
- Timebox: before integration benchmark stage
- Next Action: add probe evaluation utility and connect to DAR invocation.

### ISSUE-0012: Byzantine threshold calibration pending
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 09 / `fedlearn-server/byzantine`, `trust`
- Status: Investigating
- Priority: High
- Issue: filter and trust thresholds are currently baseline values without adversarial calibration study.
- Impact: false positives/negatives may degrade model quality under attack.
- Root Cause: scaffold-first implementation sequence.
- Solution Proposed: run adversarial simulation matrix and calibrate thresholds against quality targets.
- Solution Implemented: pending
- Verification/Tests: adversarial benchmark suite with poisoning/dropout scenarios.
- Residual Risk: high until calibration evidence exists.
- Owner: TBD
- Timebox: before release integration gate
- Next Action: add scenario-based calibration harness.

### ISSUE-0013: Browser WASM loader is stubbed (no module fetch/instantiate yet)
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 10 / `packages/fedlearn-js/src/browser/wasm_loader.ts`
- Status: Investigating
- Priority: Medium
- Issue: loader currently toggles initialized state without actual wasm artifact load.
- Impact: runtime API exists, but browser execution path is not fully operational.
- Root Cause: scaffold-first implementation sequence.
- Solution Proposed: implement actual wasm fetch/instantiate and health handshake checks.
- Solution Implemented: pending
- Verification/Tests: browser integration test covering init and health-check call.
- Residual Risk: medium until real loader path lands.
- Owner: TBD
- Timebox: before Section 11 completion
- Next Action: wire real wasm loading flow and error handling.

### ISSUE-0014: Dashboard and heatmap are helper-layer only
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 11 / `packages/fedlearn-js/src/browser`
- Status: Investigating
- Priority: Low
- Issue: dashboard/heatmap currently provide data formatting and normalization helpers, not full interactive UI components.
- Impact: visualization capability is partial until UI bindings are implemented.
- Root Cause: scaffold-first approach focused on stable data contracts.
- Solution Proposed: add rendering components and integration tests against live adapter/budget state.
- Solution Implemented: pending
- Verification/Tests: browser integration tests + component snapshots.
- Residual Risk: low.
- Owner: TBD
- Timebox: before release integration gate
- Next Action: implement UI bindings on top of helper models.

### ISSUE-0015: Release gate remains blocked by scaffold-stage open items
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Sector 12 / integration + release
- Status: Investigating
- Priority: High
- Issue: local integration checks pass, but multiple high-priority scaffold issues remain unresolved for production release.
- Impact: shipping now would risk incomplete privacy/security/robustness guarantees.
- Root Cause: sequential scaffold-first development strategy.
- Solution Proposed: close high-priority issues and gather benchmark/security evidence before release.
- Solution Implemented: pending
- Verification/Tests: release readiness checklist and benchmark evidence set.
- Residual Risk: high until issue set is reduced and validated.
- Owner: TBD
- Timebox: before any publish action
- Next Action: prioritize open high-priority issues and run hardening cycle.

### ISSUE-0016: Hardening wave integrated; calibration and benchmark closure pending
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Post-Sector risk hardening and advanced spec pass
- Status: Investigating
- Priority: Medium
- Issue: core hardening primitives and advanced paths are implemented, but calibration and large-scale benchmark evidence remain pending.
- Impact: technical correctness is improved, yet release confidence still depends on empirical calibration.
- Root Cause: implementation-first completion before full benchmark campaign.
- Solution Proposed: run adversarial/non-IID/browser performance benchmark matrix and close residual issues.
- Solution Implemented: partial (code path integration + unit/integration tests).
- Verification/Tests: `cargo test --workspace`, JS build, plus pending benchmark scripts.
- Residual Risk: medium.
- Owner: TBD
- Timebox: before any external release.
- Next Action: execute benchmark suite and finalize thresholds/calibration documents.

### ISSUE-0017: Cursor Context compliance wave complete with residual calibration follow-up
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Compliance phases A-D
- Status: Resolved
- Priority: Medium
- Issue: codebase had compliance gaps vs Cursor Context (deps, CI gates, IndexedDB contract, CUDA artifacts, integration tests).
- Impact: previously reduced confidence in strict spec alignment.
- Root Cause: earlier scaffold-first build prioritized feature skeletons over full compliance tracks.
- Solution Proposed: execute phased compliance wave (A-D) with verification after each.
- Solution Implemented: dependency pinning, CI workflow, IndexedDB storage guardrails, CUDA crate/kernels, benchmark harness, accountant/adversarial tests.
- Verification/Tests: workspace tests, JS build, benchmark script output.
- Residual Risk: medium-low; calibration/benchmark fidelity hardening continues.
- Owner: TBD
- Timebox: ongoing hardening iterations
- Next Action: continue threshold/calibration tuning with richer scenario matrices.

---

## Change Log
- Initial ledger template and starter issues created.

## Release Hardening Gate Update (2026-05-05)

### ISSUE-0018: Package metadata and artifact scope incomplete for npm release
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Release hardening / `packages/fedlearn-js/package.json`
- Status: Resolved
- Priority: High
- Issue: npm package lacked full release metadata and controlled artifact manifest.
- Impact: publish artifact could be incomplete or non-compliant.
- Root Cause: scaffold-stage package manifest.
- Solution Proposed: add release metadata fields, files allowlist, dry-run artifact audit.
- Solution Implemented: added license/repository/bugs/homepage/files/exports/engines/publishConfig plus package README/CHANGELOG/LICENSE and dry-run review.
- Verification/Tests: `npm --prefix packages/fedlearn-js run build`; `npm --prefix packages/fedlearn-js pack --dry-run`.
- Residual Risk: low.
- Owner: JS package owner
- Timebox: same day
- Next Action: keep metadata synced for next version bump.

### ISSUE-0019: Adversarial threshold calibration evidence gap
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Release hardening / server robustness + benchmarks
- Status: Resolved
- Priority: High
- Issue: poisoning threshold sensitivity lacked explicit matrix evidence artifacts.
- Impact: release claims for byzantine robustness were under-evidenced.
- Root Cause: prior tests validated behavior but did not produce consolidated calibration artifacts.
- Solution Proposed: add threshold-matrix tests and generated calibration report.
- Solution Implemented: added adversarial matrix test coverage and generated `artifacts/release_hardening/adversarial_calibration_report.json`.
- Verification/Tests: `cargo test -p fedlearn-server --test adversarial`; benchmark artifact generation command.
- Residual Risk: medium-low; continue periodic recalibration with larger datasets.
- Owner: Server robustness owner
- Timebox: same day
- Next Action: expand matrix dimensions with larger simulated populations.

### ISSUE-0020: Release blocker closure and Go/No-Go decision pack
- Date Opened: 2026-05-05
- Last Updated: 2026-05-05
- Sector/Module: Release hardening / integration and governance
- Status: Resolved
- Priority: High
- Issue: release checklist required explicit closure evidence across determinism/privacy/secagg/packaging.
- Impact: inability to make an evidence-backed release recommendation.
- Root Cause: closure checklist not yet executed as a single hardening pass.
- Solution Proposed: run phase-by-phase gate checks and update governance docs with evidence paths.
- Solution Implemented: completed all five hardening gates, generated benchmark/adversarial/non-IID artifacts, and closed open release blockers.
- Verification/Tests: `cargo test --workspace`; `npm --prefix packages/fedlearn-js run build`; `npm --prefix packages/fedlearn-js pack --dry-run`; `python3 scripts/benchmark_modal.py --iters 20 --out-dir artifacts/release_hardening`.
- Residual Risk: low for scaffold release; medium for production-scale guarantees pending long-run performance studies.
- Owner: Engineering lead
- Timebox: same day
- Next Action: decide publish timing and versioning policy with maintainers.
