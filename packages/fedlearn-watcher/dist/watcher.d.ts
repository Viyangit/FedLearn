export interface FedLearnWatcherOptions {
    userId: string;
    workspaceRoot: string;
    pollMs: number;
    minUserChars?: number;
    minAssistantChars?: number;
    pendingTtlWallMs?: number;
    lookbackMs?: number;
    onLearned?: (payload: {
        pairs: number;
    }) => void;
}
export declare class FedLearnWatcherRun {
    private readonly opts;
    private reader;
    private timer;
    constructor(opts: FedLearnWatcherOptions);
    start(): void;
    stop(): void;
    private pollOnce;
    private persistState;
}
