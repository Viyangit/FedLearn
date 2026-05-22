export type CursorTurnRole = "user" | "assistant";
export interface CursorTurn {
    role: CursorTurnRole;
    content: string;
    timestamp: number;
    sessionHint: string;
}
/**
 * Depth-first walk of JSON looking for chat-like message objects.
 */
export declare function extractTurnsFromJson(data: unknown, sessionHint: string): CursorTurn[];
