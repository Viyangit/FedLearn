import Database from "better-sqlite3";
import { type CursorTurn } from "./extractTurns.js";
export declare class CursorReader {
    private readonly globalDb;
    private readonly workspaceDb;
    constructor(paths: {
        globalPath: string | null;
        workspacePath: string | null;
    });
    /** Keys + sizes for diagnostics */
    listChatRelatedKeys(db: Database.Database): {
        key: string;
        valueLength: number;
    }[];
    inspectOverview(): string;
    private readGenerations;
    private walkLikeRows;
    extractAllTurns(): CursorTurn[];
    composerUserCount(): number;
    close(): void;
}
