import { type AdapterRecord } from "./browser/adapter_store.js";
export interface SessionInteraction {
    input: string;
    output: string;
    loss?: number;
}
export interface SessionDelta {
    sessionId: string;
    interactionCount: number;
    averageLoss: number;
    generatedAt: number;
}
export interface MemorySummary {
    userId: string;
    sessionsRetained: number;
    lastUpdated: number;
    rank: number;
    autoAdjustedRankLabel: string;
    consumedEpsilon: number;
    totalEpsilon: number;
    contributionEnabled: boolean;
}
export declare class LocalSession {
    private readonly sessionId;
    private readonly startTimestamp;
    private readonly interactions;
    constructor(sessionId: string, startTimestamp?: number);
    learn(interactions: SessionInteraction[]): Promise<void>;
    close(): Promise<SessionDelta>;
}
export declare class LocalAdapter {
    private record;
    private constructor();
    static load(userId: string): Promise<LocalAdapter>;
    beginSession(sessionId?: string): LocalSession;
    apply(delta: SessionDelta): Promise<void>;
    snapshot(): AdapterRecord;
    memorySummary(): MemorySummary;
}
export declare function verifyLocalDataFlow(userId?: string): Promise<{
    ok: boolean;
    memoryPersistenceVerified: boolean;
    networkEgressDetected: boolean;
    details: string[];
}>;
