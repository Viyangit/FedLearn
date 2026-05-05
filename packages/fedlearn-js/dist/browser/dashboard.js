export function formatEpsilon(view) {
    return `${view.consumed.toFixed(2)}ε / ${view.total.toFixed(2)}ε`;
}
export function buildPrivacyDashboardText(model) {
    const lines = [];
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
export function pauseContributions(state, nowMs) {
    if (!state.contributionEnabled) {
        return state;
    }
    return {
        contributionEnabled: false,
        pausedAtMs: nowMs
    };
}
export function resumeContributions(state) {
    if (state.contributionEnabled) {
        return state;
    }
    return {
        contributionEnabled: true,
        pausedAtMs: null
    };
}
export function toggleContributions(state, nowMs) {
    return state.contributionEnabled ? pauseContributions(state, nowMs) : resumeContributions(state);
}
