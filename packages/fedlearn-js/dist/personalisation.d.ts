export interface PersonalisationState {
    sessions: number;
    turnsInSession: number;
    turnsPerSession: number;
}
export interface SigmoidConfig {
    /** Session count where the S-curve crosses ~50% pattern coverage. */
    midpoint: number;
    /** Larger values sharpen the transition (stored as 10–100 scale; k = steepness/100). */
    steepness: number;
}
/**
 * Adaptive S-curve pattern-coverage percentage (0–100).
 * Grows quickly mid-range, plateaus toward 100; tunable via env and optional cfg.
 */
export declare function adaptivePct(sessions: number, cfg?: Partial<SigmoidConfig>): number;
export declare function macroProgress(sessions: number): number;
export declare function microProgress(sessions: number, turnsInSession: number, turnsPerSession?: number): number;
export declare function personalisationPct(state: PersonalisationState): number;
export declare function sessionLabel(sessions: number): string;
/** Bar fill width 0–100 for UIs. */
export declare function barWidth(sessions: number): number;
export declare function sessionDelta(before: number, after: number): number;
