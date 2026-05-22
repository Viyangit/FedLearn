export interface WatcherStateFile {
    version: number;
    processedPairHashes: string[];
    consumedTurnFingerprints: string[];
    recentUserMessages: string[];
    /** Optional pending user line (survives watcher restarts briefly) */
    pendingUserContent?: string | null;
    pendingDeadlineWallMs?: number | null;
}
export declare function watcherStatePath(workspaceRoot: string): string;
export declare function loadWatcherState(workspaceRoot: string): WatcherStateFile;
export declare function saveWatcherState(workspaceRoot: string, state: WatcherStateFile): void;
