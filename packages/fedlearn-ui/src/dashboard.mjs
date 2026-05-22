import { LocalAdapter, barWidth, sessionLabel } from "fedlearn-core";

function progressBar(percent, width = 20) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}  ${clamped.toFixed(0)}%`;
}

export function renderDashboard(summary) {
  const coverageWidth = barWidth(summary.sessionsRetained);
  const budgetPercent = (summary.consumedEpsilon / summary.totalEpsilon) * 100;
  const filled = Math.max(1, Math.round((Math.max(0, budgetPercent) / 100) * 20));
  const budgetBar = `${"█".repeat(filled)}${"░".repeat(20 - filled)}`;
  return [
    "Your AI Memory",
    "────────────────────────────────────────────────────────",
    "Pattern coverage (from session count; not model weights):",
    `  ${progressBar(coverageWidth)}`,
    "Privacy budget used this month:",
    `  ${budgetBar}  ${summary.consumedEpsilon.toFixed(2)}ε of ${summary.totalEpsilon.toFixed(2)}ε total`,
    "────────────────────────────────────────────────────────",
    "Your data:    Never leaves this device",
    `Sharing:      Anonymous contributions  ${summary.contributionEnabled ? "ON" : "PAUSED"}`,
    `              ${sessionLabel(summary.sessionsRetained)}`,
    `Rank:         ${summary.autoAdjustedRankLabel}`
  ].join("\n");
}

export async function readSummary(userId) {
  const adapter = await LocalAdapter.load(userId);
  return adapter.memorySummary();
}
