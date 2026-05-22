# `@viyrockan/fedlearn`

One command to run the FedLearn **terminal dashboard**; optional subcommands for the **Cursor disk watcher**.

## Quick start

```bash
npx @viyrockan/fedlearn
```

Shows pattern-coverage / privacy budget from local sessions (same as [`@viyrockan/fedlearn-ui`](https://www.npmjs.com/package/@viyrockan/fedlearn-ui)).

## Commands

| Command | Action |
|---------|--------|
| `fedlearn` | Live dashboard (refreshes on an interval) |
| `fedlearn dashboard` | Same |
| `fedlearn --once` | Print dashboard once and exit |
| `fedlearn dashboard --once` | Same |
| `fedlearn watch` | Run the Cursor watcher — learns from local `state.vscdb` and writes `.cursor/rules/fedlearn.generated.mdc` (workspace defaults to **current directory**) |
| `fedlearn inspect` | Debug: show resolved DB paths and extracted turn counts |
| `fedlearn help` | Short usage |

Extra flags for the dashboard (`--interval-ms`, etc.) are passed through to `fedlearn-ui`. Watcher flags (`--workspace-root`, `--poll-ms`, `--dump-sample`, …) are passed through to `fedlearn-watcher`.

## User id

Resolution order:

1. `FEDLEARN_USER_ID`
2. OS username (`os.userInfo().username`)
3. `fedlearn-user`

Shared adapter file across tools: set **`FEDLEARN_LOCAL_STORE`** to an absolute path (see `fedlearn-core` / local adapter docs).

## Tuning pattern coverage (optional)

`FEDLEARN_MIDPOINT` and `FEDLEARN_STEEPNESS` adjust the sigmoid gauge (see `fedlearn-core`).

## Watcher / SQLite

The watcher depends on **`better-sqlite3`** (native module). If install fails, install OS build tools or run `npm rebuild better-sqlite3`. Details: [`@viyrockan/fedlearn-watcher` README](https://github.com/Viyangit/FedLearn/tree/main/packages/fedlearn-watcher).

## Development (this monorepo)

From the repo root:

```bash
npm install
node packages/fedlearn-cli/bin/fedlearn.mjs help
```

## How bins are resolved

The CLI walks up from its install path until it finds `node_modules/@viyrockan/fedlearn-ui` / `fedlearn-watcher` (peer-style deps). That avoids relying on `package.json` subpaths, which are often missing from a package’s `"exports"` map.
