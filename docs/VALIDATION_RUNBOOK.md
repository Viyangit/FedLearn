# FedLearn Validation Runbook

This runbook lists the main validation commands with current package names (`fedlearn-core`, `@viyrockan/fedlearn-ui`).

## Watcher friend validation (macOS + Cursor)

For **stronger answer deltas**, A/B proof, and a privacy one-pager with watcher-only `npx @viyrockan/fedlearn`:

- [WATCHER_FRIEND_VALIDATION.md](WATCHER_FRIEND_VALIDATION.md)
- [FRIEND_VALIDATION_PRIVACY.md](FRIEND_VALIDATION_PRIVACY.md)
- [fixtures/friend-validation-prompts.md](fixtures/friend-validation-prompts.md)

```bash
npm run build:js --silent
npm run friend-validation:targets
node scripts/friend-validation/check-acceptance.mjs --workspace-root .
```

## Layer 1 - Automated Tests

```bash
cargo test --workspace
cargo test -p fedlearn-core --test accountant_validation -- --nocapture
cargo test -p fedlearn-core --test cross_backend -- --nocapture
```

## Layer 2 - Integration Demo

```bash
npm run demo:live
```

## Layer 3 - Scripts and proxy benchmarks

```bash
python3 scripts/simulate_federation.py --devices 100 --rounds 10 --byzantine 10
python3 scripts/benchmark_modal.py --epsilon 0.1 0.5 1.0 4.0 8.0 --out-dir artifacts/validation
```

## CLI Checks

```bash
npx fedlearn-core
npx fedlearn-core health
npx fedlearn-core verify-local
npx @viyrockan/fedlearn-ui --once
```

