#!/usr/bin/env node

import {
  LocalAdapter,
  barWidth,
  sessionLabel,
  wasmHealthCheck,
  verifyLocalDataFlow
} from "../dist/index.js";

function printUsage() {
  console.log("fedlearn-core CLI");
  console.log("");
  console.log("Usage:");
  console.log("  fedlearn-core");
  console.log("  fedlearn-core health");
  console.log("  fedlearn-core verify-local");
}

function progressBar(percent, width = 20) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}  ${clamped.toFixed(0)}%`;
}

async function runDashboard() {
  const userId = process.env.FEDLEARN_USER_ID ?? "cli-dashboard";
  const adapter = await LocalAdapter.load(userId);
  const summary = adapter.memorySummary();
  const coverageWidth = barWidth(summary.sessionsRetained);
  const budgetPercent = (summary.consumedEpsilon / summary.totalEpsilon) * 100;
  const budgetBar = `${"█".repeat(Math.max(1, Math.round((budgetPercent / 100) * 20)))}${"░".repeat(
    20 - Math.max(1, Math.round((budgetPercent / 100) * 20))
  )}`;
  console.log("Your AI Memory");
  console.log("────────────────────────────────────────────────────────");
  console.log("Pattern coverage (from session count; not model weights):");
  console.log(`  ${progressBar(coverageWidth)}`);
  console.log("Privacy budget used this month:");
  console.log(
    `  ${budgetBar}  ${summary.consumedEpsilon.toFixed(1)}ε of ${summary.totalEpsilon.toFixed(1)}ε total`
  );
  console.log("────────────────────────────────────────────────────────");
  console.log("Your data:    Never leaves this device");
  console.log(`Sharing:      Anonymous contributions  ${summary.contributionEnabled ? "ON" : "PAUSED"}`);
  console.log(`              ${sessionLabel(summary.sessionsRetained)}`);
  console.log(`Rank:         ${summary.autoAdjustedRankLabel}`);
}

function runHealth() {
  const health = wasmHealthCheck();
  const payload = {
    package: "fedlearn-core",
    cli: "ok",
    wasm: health
  };
  console.log(JSON.stringify(payload, null, 2));
}

async function runVerifyLocal() {
  const verification = await verifyLocalDataFlow();
  console.log(JSON.stringify(verification, null, 2));
  if (!verification.ok) {
    process.exitCode = 1;
  }
}

const command = process.argv[2];
if (!command) {
  await runDashboard();
} else if (command === "health") {
  runHealth();
} else if (command === "verify-local") {
  await runVerifyLocal();
} else if (command === "help" || command === "--help" || command === "-h") {
  printUsage();
} else {
  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exitCode = 1;
}
