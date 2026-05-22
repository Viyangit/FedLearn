import type { CursorTurn } from "./extractTurns.js";
export interface PendingTurn {
    userContent: string;
    /** Wall clock deadline; pending dropped after this moment */
    deadlineWallMs: number;
}
export declare function turnFingerprint(t: CursorTurn): string;
export declare function pairHash(user: string, assistant: string): string;
export interface PairingOptions {
    minUserChars: number;
    minAssistantChars: number;
    pendingTtlWallMs: number;
}
export interface PairLearnEvent {
    user: string;
    assistant: string;
    pairH: string;
}
/**
 * Consume sorted turns producing learnable pairs with pending TTL (wall-clock).
 */
export declare function processTurnsIntoPairs(args: {
    sortedTurns: CursorTurn[];
    pending: PendingTurn | null;
    consumedTurnFingerprints: Set<string>;
    processedPairHashes: Set<string>;
    nowWallMs?: number;
    opts: PairingOptions;
}): {
    pendingOut: PendingTurn | null;
    newPairs: PairLearnEvent[];
    newConsumedFingerprints: string[];
};
