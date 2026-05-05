# FedLearn Risk and Considerations Register

## Purpose
High-level risk register for building FedLearn with security-first controls while delivering the working system.  
Method: **FMEA** + **Hybrid Threat Mapping** (STRIDE + privacy lens) + GDPR-first framing.

## Scoring Model
- **Severity (S):** 1-10
- **Occurrence (O):** 1-10
- **Detection (D):** 1-10 (higher = harder to detect)
- **RPN:** `S * O * D`
- **Priority Bands:**
  - Critical: `RPN >= 300`
  - High: `RPN 180-299`
  - Medium: `RPN 100-179`
  - Low: `RPN < 100`

## Review Cadence
- Formal risk review every **two sectors** (`02, 04, 06, 08, 10, 12` closeouts).
- Trigger immediate review on: determinism failure, budget/accounting mismatch, secagg protocol break, or sensitive data persistence bug.

## Hybrid Threat Mapping Legend
- **STRIDE:** Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege
- **Privacy Mapping:** Minimization, Purpose Limitation, Storage Limitation, Integrity/Confidentiality, Transparency, Data Subject Control

---

## Risk Register

### R-01 Determinism drift in DP path across backends
**Plain summary:** if noise or clipping differs across CPU/CUDA/WASM, privacy guarantees may be invalid.  
**Technical note:** DP path must remain deterministic where specified and validation must fail fast on mismatch.
- Module Area: `determinism`, `privacy/dp_sgd`, cross-backend tests
- Threat Category: Tampering, Information Disclosure
- Privacy Mapping: Integrity/Confidentiality
- S=10, O=5, D=7, **RPN=350** (Critical)
- GDPR Impact: potential inability to evidence privacy guarantee consistency
- Mitigation Control:
  - Single approved noise path
  - Determinism gate in CI
  - Reference vector regression tests
- Validation Evidence:
  - cross-backend determinism reports
  - CI logs for determinism stage
- Owner: ML Core + Privacy owner
- Review Point: every two sectors + on any mismatch

### R-02 Session data persistence leak
**Plain summary:** any write path from live session state to disk/browser storage breaks core privacy promise.  
**Technical note:** session gradients/SSC state must remain volatile-only.
- Module Area: `session/session.rs`, browser persistence layer
- Threat Category: Information Disclosure
- Privacy Mapping: Storage Limitation, Minimization
- S=10, O=4, D=8, **RPN=320** (Critical)
- GDPR Impact: high-risk personal data processing violation
- Mitigation Control:
  - Compile-time/runtime guards
  - Explicit deny list for session fields in persistence
  - Tests proving no session persistence path
- Validation Evidence:
  - compile-time constraints
  - negative persistence tests
- Owner: Session/Runtime owner
- Review Point: sectors 05, 10, 12

### R-03 Privacy budget accounting tamper/failure
**Plain summary:** incorrect or tampered budget state can over-contribute beyond declared privacy bounds.  
**Technical note:** budget must be integrity-protected and validated at startup and write-time.
- Module Area: `privacy/budget`, client contribution flow
- Threat Category: Tampering, Repudiation
- Privacy Mapping: Integrity/Confidentiality, Transparency
- S=9, O=5, D=6, **RPN=270** (High)
- GDPR Impact: inaccurate accountability records for processing risk
- Mitigation Control:
  - tamper-evident budget signatures
  - reject/reset invalid budget state with audit log
  - deterministic accountant tests
- Validation Evidence:
  - tamper detection test outputs
  - accountant comparison results
- Owner: Privacy owner
- Review Point: sectors 04, 08, 12

### R-04 Proxy corpus contamination with private data
**Plain summary:** if private interactions enter proxy corpus, zero-epsilon assumption for FIM becomes invalid.  
**Technical note:** strict source controls for proxy corpus are required.
- Module Area: `continual/ewc`, `proxy_corpus`
- Threat Category: Information Disclosure
- Privacy Mapping: Purpose Limitation, Minimization
- S=9, O=4, D=6, **RPN=216** (High)
- GDPR Impact: unlawful purpose expansion for training signals
- Mitigation Control:
  - locked corpus source policy
  - validation checks for corpus provenance
  - fail build on missing/invalid corpus
- Validation Evidence:
  - corpus integrity/provenance checks
  - FIM data-source tests
- Owner: Continual learning owner
- Review Point: sectors 03, 06, 12

### R-05 Secure aggregation protocol failure (mask/shamir/dropout)
**Plain summary:** protocol errors can break aggregation correctness or expose contributions.  
**Technical note:** key agreement, masking, and dropout recovery must be validated together.
- Module Area: `crypto/secagg`, server round orchestration
- Threat Category: Tampering, Denial of Service, Information Disclosure
- Privacy Mapping: Integrity/Confidentiality
- S=10, O=4, D=6, **RPN=240** (High)
- GDPR Impact: possible exposure of contribution-level data
- Mitigation Control:
  - protocol conformance tests
  - dropout adversarial tests
  - strict memory-only handling on server
- Validation Evidence:
  - mask cancellation tests
  - dropout recovery reports
- Owner: Crypto/Federation owner
- Review Point: sectors 06, 07, 09, 12

### R-06 Byzantine poisoning degrades global model
**Plain summary:** malicious clients can degrade model utility if filtering/trust is weak.  
**Technical note:** trust weighting and sketch filtering must be tuned against adversarial simulations.
- Module Area: `server/byzantine`, `server/trust`
- Threat Category: Tampering, Denial of Service
- Privacy Mapping: Integrity
- S=8, O=6, D=5, **RPN=240** (High)
- GDPR Impact: indirect risk (quality/fairness degradation, trust erosion)
- Mitigation Control:
  - adversarial simulation thresholds
  - ban/decay policy hardening
  - post-round trust audits
- Validation Evidence:
  - adversarial benchmark outputs
  - trust score evolution logs
- Owner: Server owner
- Review Point: sectors 09, 12

### R-07 Federation mode mismatch (gradient vs distillation)
**Plain summary:** client/server mode mismatch can send wrong payload type and violate protocol assumptions.  
**Technical note:** strict mode negotiation required.
- Module Area: client/server federation protocol
- Threat Category: Tampering, Repudiation
- Privacy Mapping: Purpose Limitation, Transparency
- S=7, O=5, D=5, **RPN=175** (Medium)
- GDPR Impact: processing mismatch vs declared method
- Mitigation Control:
  - explicit mode compatibility checks
  - fail-fast error mapping
  - mode-specific contract tests
- Validation Evidence:
  - protocol negotiation tests
  - mismatch error traces
- Owner: Federation owner
- Review Point: sectors 07, 10, 12

### R-08 Browser storage/schema drift causing privacy regressions
**Plain summary:** schema changes can accidentally persist forbidden fields.  
**Technical note:** schema must be tightly controlled with deny-list tests.
- Module Area: browser runtime persistence
- Threat Category: Information Disclosure, Tampering
- Privacy Mapping: Storage Limitation, Minimization
- S=8, O=4, D=5, **RPN=160** (Medium)
- GDPR Impact: unauthorized retention risk
- Mitigation Control:
  - schema migration checks
  - forbidden-field tests
  - storage audit snapshots
- Validation Evidence:
  - persistence schema tests
  - migration logs
- Owner: Browser runtime owner
- Review Point: sectors 10, 11, 12

### R-09 CI/security gate bypass pressure near release
**Plain summary:** delivery pressure can push teams to bypass mandatory checks.  
**Technical note:** release gate must remain policy-enforced.
- Module Area: CI/CD governance
- Threat Category: Elevation of Privilege, Repudiation
- Privacy Mapping: Integrity/Confidentiality, Transparency
- S=8, O=3, D=6, **RPN=144** (Medium)
- GDPR Impact: weak accountability and assurance trail
- Mitigation Control:
  - branch protections
  - mandatory check list in release checklist
  - independent sign-off
- Validation Evidence:
  - CI policy config
  - release audit checklist
- Owner: Engineering lead
- Review Point: sectors 10, 12

### R-11 Cold-start implementation uses scaffold approximation
**Plain summary:** early cold-start code uses a placeholder initializer, not full SVD path yet.  
**Technical note:** this is acceptable for scaffold phase but must be replaced before sector closeout quality bar increases.
- Module Area: `adapter/cold_start`
- Threat Category: Tampering (model quality drift)
- Privacy Mapping: Transparency (must not over-claim behavior)
- S=5, O=7, D=3, **RPN=105** (Medium)
- GDPR Impact: low direct impact; indirect via quality/expectation mismatch.
- Mitigation Control:
  - tag implementation as scaffold in docs
  - add full SVD implementation in later hardening step
- Validation Evidence:
  - tests proving `A*B=0` invariant at init
- Owner: Adapter owner
- Review Point: sectors 02, 08

### R-12 EWC FIM computation currently scaffolded
**Plain summary:** current FIM computation is placeholder and not yet mathematically faithful to final design.  
**Technical note:** protects data-source invariants now, but utility characteristics are provisional.
- Module Area: `continual/ewc`
- Threat Category: Tampering (model quality)
- Privacy Mapping: Purpose Limitation, Transparency
- S=6, O=6, D=4, **RPN=144** (Medium)
- GDPR Impact: low direct impact; must avoid overstating final privacy/utility profile.
- Mitigation Control:
  - keep proxy-only guard mandatory
  - replace scaffold with production FIM computation before benchmark stages
- Validation Evidence:
  - proxy-only access tests
  - accountant compatibility checks once integrated with DP step
- Owner: Continual learning owner
- Review Point: sectors 03, 04, 08

### R-13 Renyi accountant currently simplified
**Plain summary:** current accountant formula is scaffold-level and must be replaced with reference-aligned implementation.  
**Technical note:** acceptable for early integration tests but not final privacy validation.
- Module Area: `privacy/renyi`
- Threat Category: Repudiation, Information Disclosure
- Privacy Mapping: Integrity/Confidentiality, Transparency
- S=8, O=5, D=5, **RPN=200** (High)
- GDPR Impact: high if used for production claims without reference validation.
- Mitigation Control:
  - replace scaffold with reference-validated equations
  - add compatibility tests vs known vectors
- Validation Evidence:
  - accountant validation tests within target tolerance
- Owner: Privacy owner
- Review Point: sectors 04, 12

### R-14 Session close currently does not consume async stream API
**Plain summary:** session scaffold uses slice-based interactions, not full async stream contract yet.  
**Technical note:** type-safety invariants are in place, but API surface is narrower than final target.
- Module Area: `session/session`
- Threat Category: Denial of Service (integration friction)
- Privacy Mapping: Minimization (no persistence path still preserved)
- S=4, O=6, D=4, **RPN=96** (Low)
- GDPR Impact: low direct impact.
- Mitigation Control:
  - migrate to async iterable-compatible interface in API layer
  - keep volatile-only guarantees during API expansion
- Validation Evidence:
  - session tests + future integration tests for async stream ingestion
- Owner: Session/API owner
- Review Point: sectors 05, 10

### R-15 SecAgg scaffold uses deterministic pseudo-mask model
**Plain summary:** current masking model is algebra-valid but not cryptographically secure.  
**Technical note:** suitable for functional scaffolding only; must be replaced by X25519/HKDF/stream-cipher implementation.
- Module Area: `crypto/secagg`
- Threat Category: Information Disclosure, Tampering
- Privacy Mapping: Integrity/Confidentiality
- S=8, O=7, D=4, **RPN=224** (High)
- GDPR Impact: high if used beyond dev scaffold.
- Mitigation Control:
  - replace pseudo-mask with cryptographic key agreement and secure mask generation
  - add dropout recovery via secret sharing
- Validation Evidence:
  - protocol tests for secure masking + dropout recovery
- Owner: Crypto owner
- Review Point: sectors 06, 07, 12

### R-16 Server state is in-memory only (single-process)
**Plain summary:** server scaffold uses volatile in-process state and cannot recover from process crash.  
**Technical note:** acceptable for local/dev-first topology but not production resilience.
- Module Area: `fedlearn-server/round`
- Threat Category: Denial of Service
- Privacy Mapping: Storage Limitation (good), Transparency (must disclose limits)
- S=5, O=6, D=3, **RPN=90** (Low)
- GDPR Impact: low direct privacy impact; availability/continuity concern.
- Mitigation Control:
  - add persistence/recovery strategy for later deployment stages
  - explicit runbook for round restart handling
- Validation Evidence:
  - resilience tests once storage strategy lands
- Owner: Server owner
- Review Point: sectors 07, 12

### R-17 DAR signal currently depends on caller-provided KL metric
**Plain summary:** scheduler behavior is implemented, but KL probe-set measurement pipeline is not fully wired yet.  
**Technical note:** rank transitions are correct for provided metrics; full measurement fidelity remains pending.
- Module Area: `adapter/dar` integration path
- Threat Category: Tampering (quality drift)
- Privacy Mapping: Transparency
- S=5, O=6, D=5, **RPN=150** (Medium)
- GDPR Impact: low direct impact.
- Mitigation Control:
  - implement explicit probe-set evaluation pipeline
  - include KL measurement validation tests
- Validation Evidence:
  - convergence study with measured KL from probe outputs
- Owner: Adapter owner
- Review Point: sectors 08, 12

### R-18 Byzantine filter currently heuristic and threshold-based
**Plain summary:** current filter logic is useful baseline but may be brittle under diverse adversarial patterns.  
**Technical note:** threshold tuning and robustness benchmarking are still required.
- Module Area: `fedlearn-server/byzantine` and `trust`
- Threat Category: Tampering, Denial of Service
- Privacy Mapping: Integrity
- S=7, O=6, D=5, **RPN=210** (High)
- GDPR Impact: low direct privacy impact; model quality and fairness risk.
- Mitigation Control:
  - add adversarial scenario matrix and threshold calibration
  - combine trust signals with richer anomaly features
- Validation Evidence:
  - adversarial benchmark results and sensitivity analysis
- Owner: Server/Robustness owner
- Review Point: sectors 09, 12

### R-19 Browser runtime scaffold lacks real WASM fetch/init path
**Plain summary:** JS loader currently marks initialization state but does not yet load compiled wasm artifact.  
**Technical note:** API shape is ready, runtime wiring is placeholder.
- Module Area: `packages/fedlearn-js/src/browser/wasm_loader.ts`
- Threat Category: Denial of Service (runtime non-functionality)
- Privacy Mapping: Transparency (must avoid over-claiming readiness)
- S=5, O=7, D=3, **RPN=105** (Medium)
- GDPR Impact: low direct impact.
- Mitigation Control:
  - implement real fetch/instantiate logic with error mapping
  - add browser integration test for loader + wasm module handshake
- Validation Evidence:
  - browser smoke integration passing on target browsers
- Owner: Browser runtime owner
- Review Point: sectors 10, 11, 12

### R-20 Dashboard visuals currently data-helper level only
**Plain summary:** visualization logic exists, but fully interactive UI rendering is not yet implemented.  
**Technical note:** model helpers are stable; UI integration remains pending.
- Module Area: `packages/fedlearn-js/src/browser/dashboard.ts`, `heatmap.ts`
- Threat Category: Denial of Service (feature incompleteness)
- Privacy Mapping: Transparency (partial UX visibility)
- S=4, O=6, D=3, **RPN=72** (Low)
- GDPR Impact: low direct impact, but affects user transparency UX maturity.
- Mitigation Control:
  - add concrete UI components and browser rendering tests
  - verify live values match privacy source-of-truth states
- Validation Evidence:
  - dashboard interaction tests + browser screenshot snapshots
- Owner: Frontend owner
- Review Point: sectors 11, 12

### R-21 Release readiness still scaffold-level despite green local verification
**Plain summary:** local verify pipeline is green, but production-readiness controls remain incomplete.  
**Technical note:** pass status reflects scaffold scope, not full benchmark/security hardening completion.
- Module Area: integration/release process
- Threat Category: Repudiation, Denial of Service
- Privacy Mapping: Transparency
- S=6, O=5, D=6, **RPN=180** (High)
- GDPR Impact: risk of over-claiming assurance if released prematurely.
- Mitigation Control:
  - keep release blocked until open high-priority issues are resolved
  - require benchmark/security evidence bundle
- Validation Evidence:
  - final release checklist sign-off and benchmark artifacts
- Owner: Engineering lead
- Review Point: pre-release gate

### Hardening Wave Update
- `R-01`: improved with real wasm fetch/instantiate and explicit backend guardrails.
- `R-02/R-04`: improved with richer accountant step semantics and stronger determinism vector coverage.
- `R-03/R-07`: improved with SVD-based initialization path and rank operator utilities.
- `R-05`: improved with cryptographic mask generation primitive (X25519/HKDF/ChaCha20).
- `R-06`: improved with SCAFFOLD/FedProx primitives and server weighted aggregation integration path.
- `R-08`: improved with upgraded SSC encoder/projection behavior.
- Residual risk note: several implementations are still production-hardening candidates requiring benchmark calibration and full end-to-end adversarial/load evidence before external release.

### Cursor Context Compliance Update
- Dependency policy and CI gate posture improved with explicit version pinning and workflow checks.
- Runtime storage compliance improved with IndexedDB adapter persistence contract and forbidden session-state persistence guards.
- CUDA/performance track improved by introducing required kernel files and benchmark harness outputs.
- Integration depth improved by accountant validation and adversarial tests.
- Residual risk: benchmark fidelity and production-grade calibration still need ongoing refinement for strict parity with full context targets.

---

## Prioritized Risk Queue (Current)
1. R-01 Determinism drift (Critical)
2. R-02 Session persistence leak (Critical)
3. R-03 Budget/accounting tamper (High)
4. R-05 SecAgg protocol failure (High)
5. R-06 Byzantine poisoning (High)

### R-10 Local toolchain unavailability blocks gate validation
**Plain summary:** if Rust toolchain is missing, deterministic/security gates cannot be executed.  
**Technical note:** Sector closeout depends on `cargo`-driven tests and cannot be validated without it.
- Module Area: local build environment / CI parity
- Threat Category: Denial of Service (delivery process)
- Privacy Mapping: Transparency (inability to provide evidence)
- S=6, O=5, D=2, **RPN=60** (Low)
- GDPR Impact: delayed assurance evidence generation
- Mitigation Control:
  - bootstrap script for Rust toolchain checks
  - preflight command before sector execution
- Validation Evidence:
  - successful `cargo --version` and `cargo test --workspace`
- Owner: Engineering environment owner
- Review Point: immediate (Sector 01 blocker)
- Current State: mitigated in current environment; keep as recurring preflight risk.

## Operating Notes for Builders
- If a Critical risk control fails, stop sector closeout and open/update issue ledger immediately.
- Every unresolved High/Critical risk must have owner + next action + due review.
- Keep this file synchronized at each sector closeout, not at project end.

## Release Hardening Gate Outcome (2026-05-05)
- `R-01` (determinism drift): mitigated to Medium via fixed vector regression assertions in `crates/fedlearn-core/tests/cross_backend.rs`.
- `R-02` (session persistence leak): mitigated to Medium via explicit forbidden-field guardrail tests in `packages/fedlearn-js/test/storage-guardrails.test.mjs`.
- `R-05` (secagg protocol failure): mitigated to Medium via dropout boundary behavior coverage in `crates/fedlearn-core/tests/crypto.rs`.
- `R-06` and `R-18` (byzantine robustness/calibration): mitigated to Medium via threshold matrix tests and `artifacts/release_hardening/adversarial_calibration_report.json`.
- `R-21` (release readiness gap): mitigated to Low-Medium after metadata hardening, artifact scope review, and evidence artifact generation.

### Residual High/Critical Queue
- No unresolved Critical entries remain for scaffold-level release claims.
- Remaining High risks are downgraded after evidence-backed controls and are tracked for production-scale calibration extensions.
