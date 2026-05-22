export { initWasm, wasmHealthCheck, selectBackends } from "./browser/wasm_loader.js";
export type { BrowserInitOptions } from "./browser/wasm_loader.js";
export {
  buildPrivacyDashboardText,
  formatEpsilon,
  pauseContributions,
  resumeContributions,
  toggleContributions
} from "./browser/dashboard.js";
export type { PrivacyDashboardControlState } from "./browser/dashboard.js";
export { buildHeatMapModel, normalizeIntensity } from "./browser/heatmap.js";
export { openAdapterDb, saveAdapterRecord, loadAdapterRecord } from "./browser/adapter_store.js";
export { validateNoForbiddenFields } from "./browser/adapter_store.js";
export { LocalAdapter, LocalSession } from "./local_adapter.js";
export { verifyLocalDataFlow } from "./local_adapter.js";
export type { SessionDelta, SessionInteraction, MemorySummary } from "./local_adapter.js";
export {
  adaptivePct,
  barWidth,
  macroProgress,
  microProgress,
  personalisationPct,
  sessionDelta,
  sessionLabel
} from "./personalisation.js";
export type { PersonalisationState, SigmoidConfig } from "./personalisation.js";

export interface RuntimeInfo {
  runtime: "browser";
  wasmInitialized: boolean;
}

