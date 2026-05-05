export interface EpsilonView {
  consumed: number;
  total: number;
}

export function formatEpsilon(view: EpsilonView): string {
  return `${view.consumed.toFixed(2)}ε / ${view.total.toFixed(2)}ε`;
}

export interface PrivacyDashboardViewModel {
  personalizationPercent: number;
  consumedEpsilon: number;
  totalEpsilon: number;
  contributionEnabled: boolean;
  federationMode: "gradient" | "distillation";
  tier: "dp" | "he";
  sessionsRetained?: number;
  rankLabel?: string;
}

export function buildPrivacyDashboardText(model: PrivacyDashboardViewModel): string[] {
  const lines: string[] = [];
  lines.push(`Personalization: ${model.personalizationPercent.toFixed(1)}%`);
  lines.push(`Budget: ${formatEpsilon({ consumed: model.consumedEpsilon, total: model.totalEpsilon })}`);
  lines.push(`Sharing: ${model.contributionEnabled ? "ON" : "PAUSED"}`);
  if (typeof model.sessionsRetained === "number") {
    lines.push(`Sessions: ${model.sessionsRetained} learned, all retained`);
  }
  if (model.rankLabel) {
    lines.push(`Rank: ${model.rankLabel}`);
  }
  lines.push(`Mode: ${model.federationMode} | Tier: ${model.tier}`);
  return lines;
}

export interface PrivacyDashboardControlState {
  contributionEnabled: boolean;
  pausedAtMs: number | null;
}

export function pauseContributions(state: PrivacyDashboardControlState, nowMs: number): PrivacyDashboardControlState {
  if (!state.contributionEnabled) {
    return state;
  }
  return {
    contributionEnabled: false,
    pausedAtMs: nowMs
  };
}

export function resumeContributions(state: PrivacyDashboardControlState): PrivacyDashboardControlState {
  if (state.contributionEnabled) {
    return state;
  }
  return {
    contributionEnabled: true,
    pausedAtMs: null
  };
}

export function toggleContributions(
  state: PrivacyDashboardControlState,
  nowMs: number
): PrivacyDashboardControlState {
  return state.contributionEnabled ? pauseContributions(state, nowMs) : resumeContributions(state);
}

