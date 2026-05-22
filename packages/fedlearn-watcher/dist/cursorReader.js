import Database from "better-sqlite3";
import { extractTurnsFromJson } from "./extractTurns.js";
import { turnsFromAiServiceGenerations } from "./composerExtract.js";
function valueToString(value) {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string") {
        return value;
    }
    if (Buffer.isBuffer(value)) {
        return value.toString("utf8");
    }
    if (value instanceof Uint8Array) {
        return Buffer.from(value).toString("utf8");
    }
    return String(value);
}
function openReadonlyDb(p) {
    return new Database(p, {
        readonly: true,
        fileMustExist: true,
        timeout: 3000
    });
}
function attachJournalWarn(db) {
    try {
        const row = db.pragma("journal_mode", { simple: true });
        const mode = typeof row === "string" ? row.toLowerCase() : "";
        if (mode && mode !== "wal") {
            console.warn("[FedLearn] SQLite not in WAL mode. Increase --poll-ms to 3000 to reduce lock contention.");
        }
    }
    catch {
        // ignore
    }
}
export class CursorReader {
    globalDb;
    workspaceDb;
    constructor(paths) {
        this.globalDb = paths.globalPath != null ? openReadonlyDb(paths.globalPath) : null;
        this.workspaceDb = paths.workspacePath != null ? openReadonlyDb(paths.workspacePath) : null;
        if (this.globalDb) {
            attachJournalWarn(this.globalDb);
        }
        if (this.workspaceDb) {
            attachJournalWarn(this.workspaceDb);
        }
    }
    /** Keys + sizes for diagnostics */
    listChatRelatedKeys(db) {
        try {
            const rows = db
                .prepare(`SELECT key, length(value) AS len FROM ItemTable
           WHERE key LIKE '%chat%' OR key LIKE '%conversation%' OR key LIKE '%aiService%' OR key LIKE '%composer%'`)
                .all();
            return rows.map((r) => ({ key: r.key, valueLength: r.len ?? 0 }));
        }
        catch {
            return [];
        }
    }
    inspectOverview() {
        const lines = [];
        if (this.workspaceDb) {
            lines.push("--- workspace DB ---");
            for (const k of this.listChatRelatedKeys(this.workspaceDb)) {
                lines.push(`${k.key} (~${k.valueLength} bytes)`);
            }
        }
        if (this.globalDb) {
            lines.push("--- global DB ---");
            for (const k of this.listChatRelatedKeys(this.globalDb)) {
                lines.push(`${k.key} (~${k.valueLength} bytes)`);
            }
        }
        return lines.join("\n");
    }
    readGenerations(workspace) {
        const db = workspace ? this.workspaceDb : this.globalDb;
        if (!db) {
            return [];
        }
        try {
            const row = db
                .prepare("SELECT value FROM ItemTable WHERE key = ?")
                .get("aiService.generations");
            if (!row) {
                return [];
            }
            const raw = JSON.parse(valueToString(row.value));
            return turnsFromAiServiceGenerations(raw);
        }
        catch {
            return [];
        }
    }
    walkLikeRows(db) {
        let rows;
        try {
            rows = db
                .prepare(`SELECT key, value FROM ItemTable
           WHERE key LIKE '%chat%' OR key LIKE '%conversation%' OR key LIKE '%aiService%' OR key LIKE '%composer%'`)
                .all();
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/locked|busy/i.test(msg)) {
                return [];
            }
            throw e;
        }
        const turns = [];
        for (const row of rows) {
            if (row.key === "aiService.generations") {
                continue;
            }
            const raw = valueToString(row.value);
            if (!raw || raw.length < 2) {
                continue;
            }
            try {
                const parsed = JSON.parse(raw);
                turns.push(...extractTurnsFromJson(parsed, row.key));
            }
            catch {
                // not JSON
            }
        }
        return turns;
    }
    extractAllTurns() {
        const turns = [];
        turns.push(...this.readGenerations(true));
        turns.push(...this.readGenerations(false));
        const dbs = [this.workspaceDb, this.globalDb].filter((x) => x !== null);
        const seenDb = new Set();
        for (const db of dbs) {
            if (seenDb.has(db)) {
                continue;
            }
            seenDb.add(db);
            turns.push(...this.walkLikeRows(db));
        }
        turns.sort((a, b) => a.timestamp - b.timestamp);
        return turns;
    }
    composerUserCount() {
        return this.readGenerations(true).filter((t) => t.role === "user").length;
    }
    close() {
        try {
            this.globalDb?.close();
        }
        catch {
            // ignore
        }
        try {
            this.workspaceDb?.close();
        }
        catch {
            // ignore
        }
    }
}
