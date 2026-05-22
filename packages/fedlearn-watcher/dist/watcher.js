import { LocalAdapter } from "fedlearn-core";
import { CursorReader } from "./cursorReader.js";
import { findCursorStateDbPath } from "./findCursorStore.js";
import { findWorkspaceStateDbForFolder } from "./workspaceResolve.js";
import { loadWatcherState, saveWatcherState } from "./stateFile.js";
import { processTurnsIntoPairs } from "./pairing.js";
import { writeFedlearnGeneratedMdcSync } from "./rulesWriter.js";
function envInt(name, fallback) {
    const raw = process.env[name];
    if (!raw) {
        return fallback;
    }
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
}
function filterTurnsByLookback(turns, lookbackMs, now) {
    const floor = now - lookbackMs;
    return turns.filter((t) => t.timestamp >= floor);
}
export class FedLearnWatcherRun {
    opts;
    reader = null;
    timer = null;
    constructor(opts) {
        this.opts = opts;
    }
    start() {
        const globalPath = findCursorStateDbPath();
        const workspacePath = findWorkspaceStateDbForFolder(this.opts.workspaceRoot);
        if (!globalPath && !workspacePath) {
            throw new Error("Cursor SQLite not found (global or workspace state.vscdb). Install Cursor and open this folder once.");
        }
        if (!workspacePath) {
            console.warn(`[fedlearn-watcher] No workspaceStorage DB matched workspaceRoot=${this.opts.workspaceRoot}; composer extraction may miss aiService.generations.`);
        }
        this.reader = new CursorReader({ globalPath, workspacePath });
        const poll = () => {
            void this.pollOnce().catch((e) => {
                console.error("[fedlearn-watcher] poll error:", e instanceof Error ? e.message : e);
            });
        };
        poll();
        this.timer = setInterval(poll, this.opts.pollMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.reader?.close();
        this.reader = null;
    }
    async pollOnce() {
        if (!this.reader) {
            return;
        }
        const lookbackMs = this.opts.lookbackMs ?? envInt("FEDLEARN_WATCHER_LOOKBACK_MS", 3600_000);
        const minUser = this.opts.minUserChars ?? envInt("FEDLEARN_WATCHER_MIN_USER_CHARS", 10);
        const minAssist = this.opts.minAssistantChars ?? envInt("FEDLEARN_WATCHER_MIN_ASSISTANT_CHARS", 20);
        const pendingTtl = this.opts.pendingTtlWallMs ?? envInt("FEDLEARN_WATCHER_PENDING_TTL_MS", 30_000);
        const now = Date.now();
        let turns;
        try {
            turns = this.reader.extractAllTurns();
        }
        catch {
            return;
        }
        turns = filterTurnsByLookback(turns, lookbackMs, now);
        const state = loadWatcherState(this.opts.workspaceRoot);
        const consumedSet = new Set(state.consumedTurnFingerprints);
        const pairSet = new Set(state.processedPairHashes);
        let pendingIn = null;
        if (state.pendingUserContent && typeof state.pendingDeadlineWallMs === "number") {
            pendingIn = {
                userContent: state.pendingUserContent,
                deadlineWallMs: state.pendingDeadlineWallMs
            };
        }
        const { pendingOut, newPairs } = processTurnsIntoPairs({
            sortedTurns: turns,
            pending: pendingIn,
            consumedTurnFingerprints: consumedSet,
            processedPairHashes: pairSet,
            nowWallMs: now,
            opts: {
                minUserChars: minUser,
                minAssistantChars: minAssist,
                pendingTtlWallMs: pendingTtl
            }
        });
        if (newPairs.length === 0) {
            this.persistState(state, pendingOut, consumedSet, pairSet);
            return;
        }
        const adapter = await LocalAdapter.load(this.opts.userId);
        let successPairs = 0;
        for (const p of newPairs) {
            try {
                const session = adapter.beginSession(`watcher-${now}-${p.pairH.slice(0, 8)}`);
                await session.learn([{ input: p.user, output: p.assistant }]);
                await adapter.apply(await session.close());
                pairSet.add(p.pairH);
                state.recentUserMessages.push(p.user);
                successPairs += 1;
            }
            catch {
                // skip failed applications
            }
        }
        if (successPairs > 0) {
            const reloaded = await LocalAdapter.load(this.opts.userId);
            writeFedlearnGeneratedMdcSync(this.opts.workspaceRoot, reloaded, state.recentUserMessages);
            this.opts.onLearned?.({ pairs: successPairs });
        }
        this.persistState(state, pendingOut, consumedSet, pairSet);
    }
    persistState(state, pendingOut, consumedSet, pairSet) {
        state.consumedTurnFingerprints = [...consumedSet];
        state.processedPairHashes = [...pairSet];
        if (pendingOut && Date.now() <= pendingOut.deadlineWallMs) {
            state.pendingUserContent = pendingOut.userContent;
            state.pendingDeadlineWallMs = pendingOut.deadlineWallMs;
        }
        else {
            state.pendingUserContent = null;
            state.pendingDeadlineWallMs = null;
        }
        saveWatcherState(this.opts.workspaceRoot, state);
    }
}
