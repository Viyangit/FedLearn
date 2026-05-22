function getProcessEnv() {
    const g = globalThis;
    return g.process?.env;
}
function readEnvNumber(name, fallback) {
    try {
        const raw = getProcessEnv()?.[name]?.trim();
        if (raw === undefined || raw === "") {
            return fallback;
        }
        const n = Number(raw);
        return Number.isFinite(n) ? n : fallback;
    }
    catch {
        return fallback;
    }
}
const FALLBACK_DEFAULTS = {
    midpoint: 15,
    steepness: 40
};
function resolvedDefaults() {
    return {
        midpoint: readEnvNumber("FEDLEARN_MIDPOINT", FALLBACK_DEFAULTS.midpoint),
        steepness: readEnvNumber("FEDLEARN_STEEPNESS", FALLBACK_DEFAULTS.steepness)
    };
}
/**
 * Adaptive S-curve pattern-coverage percentage (0–100).
 * Grows quickly mid-range, plateaus toward 100; tunable via env and optional cfg.
 */
export function adaptivePct(sessions, cfg = {}) {
    if (sessions <= 0) {
        return 0;
    }
    const defaults = resolvedDefaults();
    const midpoint = cfg.midpoint !== undefined && Number.isFinite(cfg.midpoint) ? cfg.midpoint : defaults.midpoint;
    const steepness = cfg.steepness !== undefined && Number.isFinite(cfg.steepness) && cfg.steepness > 0
        ? cfg.steepness
        : defaults.steepness;
    const k = steepness / 100;
    const raw = 1 / (1 + Math.exp(-k * (sessions - midpoint)));
    return parseFloat((raw * 100).toFixed(2));
}
/** Same numeric curve as `macroProgress` / `adaptivePct` at the next completed session count. */
function nextMacroProgress(sessions) {
    return adaptivePct(sessions + 1);
}
export function macroProgress(sessions) {
    return adaptivePct(sessions);
}
export function microProgress(sessions, turnsInSession, turnsPerSession = 1) {
    if (turnsInSession <= 0 || turnsPerSession <= 0) {
        return 0;
    }
    const current = macroProgress(sessions);
    const next = nextMacroProgress(sessions);
    const headroom = Math.max(0, next - current);
    const ratio = Math.min(1, turnsInSession / turnsPerSession);
    const curve = Math.sqrt(ratio);
    return headroom * curve;
}
export function personalisationPct(state) {
    const macro = macroProgress(state.sessions);
    const micro = microProgress(state.sessions, state.turnsInSession, state.turnsPerSession);
    return Math.min(100, Number((macro + micro).toFixed(2)));
}
export function sessionLabel(sessions) {
    if (sessions === 0) {
        return "No sessions recorded yet";
    }
    const pct = adaptivePct(sessions);
    const noun = sessions === 1 ? "session" : "sessions";
    return `${sessions} ${noun} · ${pct.toFixed(1)}% pattern coverage`;
}
/** Bar fill width 0–100 for UIs. */
export function barWidth(sessions) {
    return Math.min(100, adaptivePct(sessions));
}
export function sessionDelta(before, after) {
    return parseFloat((adaptivePct(after) - adaptivePct(before)).toFixed(2));
}
