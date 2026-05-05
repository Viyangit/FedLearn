# Changelog

## 0.2.3

- Fixed dashboard personalization initialization so zero retained sessions render `0% personalised`.
- Added deterministic personalization growth from retained-session count.
- Added `FEDLEARN_USER_ID` support in CLI for reproducible verification scenarios.

## 0.2.2

- Made `npx fedlearn-core` default to an explainer-style terminal dashboard view.
- Added `verify-local` CLI command to validate local-memory persistence and no-network local flow behavior.
- Added memory summary APIs for repeatable session-retention checks.
- Added CLI and local-flow verification tests and updated verification docs.

## 0.2.1

- Added executable CLI entrypoint (`fedlearn-core`) for `npx`/global command usage.
- Added `health` command output for quick runtime/package sanity checks.

## 0.2.0

- Added explainer-aligned high-level `LocalAdapter` session/apply facade.
- Added interactive privacy dashboard control state helpers (pause/resume contributions).
- Hardened WASM initialization diagnostics with explicit invalid-binary checks.
- Aligned package/docs references to `fedlearn-core`.
- Removed self-dependency and prepared release verification gates for npm publication.

## 0.1.0

- Initial scaffold with browser WASM loader and runtime helpers.
- Added privacy dashboard and heatmap helper APIs.
- Added IndexedDB adapter storage contract and guardrails.
- Added release-hardening metadata and packaging controls.

