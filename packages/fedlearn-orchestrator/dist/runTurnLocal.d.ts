import { LocalAdapter } from "fedlearn-core";
export interface LocalTurnLogEntry {
    turnIndex: number;
    flowStage: "micro_update" | "model_generate" | "learn_apply";
    success: boolean;
    latencyMs: number;
}
export interface RunTurnLocalInput {
    userInput: string;
    conversationIdPrefix?: string;
    reply?: (ctx: {
        userInput: string;
        personalizationContext: string;
        adapter: LocalAdapter;
        pct: number;
    }) => string | Promise<string>;
    onLog?: (entry: LocalTurnLogEntry) => void;
}
export interface RunTurnLocalResult {
    reply: string;
    sessions: number;
    turnsInSession: number;
    personalizationPct: number;
    consumedEpsilon: number;
}
export interface GuaranteedLocalRunner {
    readonly userId: string;
    runTurn(input: RunTurnLocalInput): Promise<RunTurnLocalResult>;
    syncFromDisk(): Promise<void>;
}
/**
 * Guaranteed per-turn learning using LocalAdapter only (no MCP, no Cursor).
 * Every completed call persists one session via beginSession → learn → apply.
 */
export declare function createGuaranteedLocalRunner(userId: string): Promise<GuaranteedLocalRunner>;
