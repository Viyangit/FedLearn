export interface EpsilonView {
    consumed: number;
    total: number;
}
export declare function formatEpsilon(view: EpsilonView): string;
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
export declare function buildPrivacyDashboardText(model: PrivacyDashboardViewModel): string[];
export interface PrivacyDashboardControlState {
    contributionEnabled: boolean;
    pausedAtMs: number | null;
}
export declare function pauseContributions(state: PrivacyDashboardControlState, nowMs: number): PrivacyDashboardControlState;
export declare function resumeContributions(state: PrivacyDashboardControlState): PrivacyDashboardControlState;
export declare function toggleContributions(state: PrivacyDashboardControlState, nowMs: number): PrivacyDashboardControlState;
