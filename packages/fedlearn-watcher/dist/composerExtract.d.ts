import type { CursorTurn } from "./extractTurns.js";
export interface AiServiceGenerationRow {
    unixMs?: number;
    generationUUID?: string;
    type?: string;
    textDescription?: string;
}
/**
 * Cursor workspace `aiService.generations`: typically **user** composer prompts only.
 * When `synthAssistant` is true (default), inject a synthetic assistant turn so FedLearn can run learn/apply.
 */
export declare function turnsFromAiServiceGenerations(rawJson: unknown, options?: {
    synthAssistant?: boolean;
}): CursorTurn[];
