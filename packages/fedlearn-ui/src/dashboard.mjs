import { LocalAdapter } from "fedlearn-core";

export function personalizationFromSessions(sessionsRetained) {
  if (sessionsRetained <= 0) {
    return 0;
  }
  return Math.min(100, 12 * Math.log2(sessionsRetained + 1) + sessionsRetained * 2.5);
}

function progressBar(percent, width = 20) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}  ${clamped.toFixed(0)}%`;
}

export function renderDashboard(summary) {
  const personalization = personalizationFromSessions(summary.sessionsRetained);
  const budgetPercent = (summary.consumedEpsilon / summary.totalEpsilon) * 100;
  const filled = Math.max(1, Math.round((Math.max(0, budgetPercent) / 100) * 20));
  const budgetBar = `${"█".repeat(filled)}${"░".repeat(20 - filled)}`;
  return [
    "Your AI Memory",
    "────────────────────────────────────────────────────────",
    "Personal style learned:",
    `  ${progressBar(personalization)} personalised`,
    "Privacy budget used this month:",
    `  ${budgetBar}  ${summary.consumedEpsilon.toFixed(1)}ε of ${summary.totalEpsilon.toFixed(1)}ε total`,
    "────────────────────────────────────────────────────────",
    "Your data:    Never leaves this device",
    `Sharing:      Anonymous contributions  ${summary.contributionEnabled ? "ON" : "PAUSED"}`,
    `Sessions:     ${summary.sessionsRetained} learned,  all retained`,
    `Rank:         ${summary.autoAdjustedRankLabel}`
  ].join("\n");
}

export async function readSummary(userId) {
  const adapter = await LocalAdapter.load(userId);
  return adapter.memorySummary();
}

