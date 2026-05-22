#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const thisDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Locate peer dependency bins without resolving `package.json` (many packages omit it from "exports").
 * Walks upward from this file until `node_modules/<pkgName>/bin/<binFile>` exists.
 * @param {string} pkgName
 * @param {string} binFile
 */
function resolveBin(pkgName, binFile) {
  try {
    const fallback = require.resolve(path.join(pkgName, "bin", binFile));
    if (existsSync(fallback)) {
      return fallback;
    }
  } catch {
    // continue to filesystem walk
  }

  let dir = thisDir;
  for (let i = 0; i < 12; i += 1) {
    const candidate = path.join(dir, "node_modules", pkgName, "bin", binFile);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  throw new Error(`Could not find node_modules/${pkgName}/bin/${binFile} walking up from ${thisDir}`);
}

let uiBin;
let watchBin;
try {
  uiBin = resolveBin("@viyrockan/fedlearn-ui", "fedlearn-ui.mjs");
  watchBin = resolveBin("@viyrockan/fedlearn-watcher", "fedlearn-watcher.mjs");
} catch (e) {
  console.error(
    "[fedlearn] Could not resolve @viyrockan/fedlearn-ui or @viyrockan/fedlearn-watcher. Run npm install from a project that depends on @viyrockan/fedlearn."
  );
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

function resolveUserId() {
  return process.env.FEDLEARN_USER_ID ?? os.userInfo().username ?? "fedlearn-user";
}

function childEnv() {
  return {
    ...process.env,
    FEDLEARN_USER_ID: resolveUserId()
  };
}

/**
 * @param {string} scriptPath
 * @param {string[]} args
 * @returns {Promise<number>}
 */
function runNode(scriptPath, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      shell: false,
      env: childEnv()
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) {
        resolvePromise(1);
        return;
      }
      resolvePromise(code ?? 1);
    });
  });
}

function printHelp() {
  console.log(`@viyrockan/fedlearn — FedLearn entrypoint

Usage:
  fedlearn                  Terminal dashboard (pattern coverage + budget)
  fedlearn dashboard        Same
  fedlearn --once           One-shot dashboard, then exit
  fedlearn watch            Cursor disk watcher (workspace = current directory)
  fedlearn inspect          Inspect Cursor DB paths and extracted turns
  fedlearn help             This message

User id: FEDLEARN_USER_ID, else OS username, else "fedlearn-user".
Shared store: FEDLEARN_LOCAL_STORE (absolute path).
Tune gauge: FEDLEARN_MIDPOINT, FEDLEARN_STEEPNESS.

For SQLite / better-sqlite3 notes see @viyrockan/fedlearn-watcher.
`);
}

/**
 * If args lack --workspace-root, prepend it with cwd (absolute).
 * @param {string[]} rest
 * @param {"run" | "inspect"} cmd
 */
function withWorkspaceRoot(rest, cmd) {
  const hasWs = rest.some((a, i) => a === "--workspace-root" && rest[i + 1]);
  if (hasWs) {
    return [cmd, ...rest];
  }
  const cwd = path.resolve(process.cwd());
  return [cmd, "--workspace-root", cwd, ...rest];
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    process.exitCode = await runNode(uiBin, []);
    return;
  }

  const first = argv[0];

  if (first === "help" || first === "-h" || first === "--help") {
    printHelp();
    process.exitCode = 0;
    return;
  }

  if (first === "watch") {
    const args = withWorkspaceRoot(argv.slice(1), "run");
    process.exitCode = await runNode(watchBin, args);
    return;
  }

  if (first === "inspect") {
    const args = withWorkspaceRoot(argv.slice(1), "inspect");
    process.exitCode = await runNode(watchBin, args);
    return;
  }

  if (first === "dashboard") {
    process.exitCode = await runNode(uiBin, argv.slice(1));
    return;
  }

  if (first && !first.startsWith("-")) {
    printHelp();
    process.exitCode = 0;
    return;
  }

  process.exitCode = await runNode(uiBin, argv);
}

main().catch((err) => {
  console.error("[fedlearn]", err);
  process.exit(1);
});
