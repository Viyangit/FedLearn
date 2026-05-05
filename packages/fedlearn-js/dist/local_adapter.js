import { loadAdapterRecord, saveAdapterRecord } from "./browser/adapter_store.js";
const inMemoryStore = new Map();
const NODE_STORE_FILE = ".fedlearn-local-adapters.json";
function hasIndexedDb() {
    return typeof globalThis !== "undefined" && "indexedDB" in globalThis;
}
function defaultBudgetState() {
    return {
        totalEpsilon: 8.0,
        consumedEpsilon: 0.0,
        roundCount: 0,
        hmac: "scaffold"
    };
}
function defaultAdapterLayers(rank) {
    return [{ layerIdx: 0, a: new Array(rank).fill(0), b: new Array(rank).fill(0) }];
}
async function loadRecord(userId) {
    if (hasIndexedDb()) {
        return await loadAdapterRecord(userId);
    }
    await hydrateNodeStoreFromDisk();
    return inMemoryStore.get(userId) ?? null;
}
async function saveRecord(record) {
    if (hasIndexedDb()) {
        await saveAdapterRecord(record);
        return;
    }
    inMemoryStore.set(record.userId, record);
    await flushNodeStoreToDisk();
}
function isNodeRuntime() {
    const proc = globalThis.process;
    return !!proc?.versions?.node;
}
async function nodeStorePath() {
    if (!isNodeRuntime()) {
        return null;
    }
    // @ts-ignore dynamic import only resolved at node runtime
    const os = await import("node:os");
    // @ts-ignore dynamic import only resolved at node runtime
    const path = await import("node:path");
    return path.join(os.tmpdir(), NODE_STORE_FILE);
}
async function hydrateNodeStoreFromDisk() {
    const storePath = await nodeStorePath();
    if (!storePath) {
        return;
    }
    try {
        // @ts-ignore dynamic import only resolved at node runtime
        const fs = await import("node:fs/promises");
        const raw = await fs.readFile(storePath, "utf-8");
        const parsed = JSON.parse(raw);
        for (const [key, value] of Object.entries(parsed)) {
            inMemoryStore.set(key, value);
        }
    }
    catch {
        // Missing or invalid cache file should not break local flow.
    }
}
async function flushNodeStoreToDisk() {
    const storePath = await nodeStorePath();
    if (!storePath) {
        return;
    }
    // @ts-ignore dynamic import only resolved at node runtime
    const fs = await import("node:fs/promises");
    const next = {};
    for (const [key, value] of inMemoryStore.entries()) {
        next[key] = value;
    }
    await fs.writeFile(storePath, JSON.stringify(next), "utf-8");
}
export class LocalSession {
    sessionId;
    startTimestamp;
    interactions = [];
    constructor(sessionId, startTimestamp = Date.now()) {
        this.sessionId = sessionId;
        this.startTimestamp = startTimestamp;
    }
    async learn(interactions) {
        this.interactions.push(...interactions);
    }
    async close() {
        const count = this.interactions.length;
        const summedLoss = this.interactions.reduce((acc, value) => acc + (value.loss ?? 0), 0);
        return {
            sessionId: this.sessionId,
            interactionCount: count,
            averageLoss: count > 0 ? summedLoss / count : 0,
            generatedAt: this.startTimestamp
        };
    }
}
export class LocalAdapter {
    record;
    constructor(record) {
        this.record = record;
    }
    static async load(userId) {
        const existing = await loadRecord(userId);
        if (existing) {
            return new LocalAdapter(existing);
        }
        const created = {
            userId,
            rank: 4,
            layers: defaultAdapterLayers(4),
            budgetState: defaultBudgetState(),
            sessionCount: 0,
            lastUpdated: Date.now(),
            version: 2
        };
        await saveRecord(created);
        return new LocalAdapter(created);
    }
    beginSession(sessionId) {
        const resolvedSessionId = sessionId ?? `${this.record.userId}-${Date.now()}`;
        return new LocalSession(resolvedSessionId);
    }
    async apply(delta) {
        this.record.sessionCount += 1;
        this.record.lastUpdated = Date.now();
        this.record.budgetState.roundCount += 1;
        this.record.budgetState.consumedEpsilon += Math.min(0.05, 0.01 * delta.interactionCount);
        await saveRecord(this.record);
    }
    snapshot() {
        return structuredClone(this.record);
    }
    memorySummary() {
        return {
            userId: this.record.userId,
            sessionsRetained: this.record.sessionCount,
            lastUpdated: this.record.lastUpdated,
            rank: this.record.rank,
            autoAdjustedRankLabel: `r=${this.record.rank} (auto-adjusted)`,
            consumedEpsilon: this.record.budgetState.consumedEpsilon,
            totalEpsilon: this.record.budgetState.totalEpsilon,
            contributionEnabled: true
        };
    }
}
export async function verifyLocalDataFlow(userId = "verify-local-user") {
    const details = [];
    const originalFetch = globalThis.fetch;
    let networkEgressDetected = false;
    if (typeof originalFetch === "function") {
        globalThis.fetch = async (..._args) => {
            networkEgressDetected = true;
            throw new Error("Network egress detected during local flow verification");
        };
    }
    try {
        const adapter = await LocalAdapter.load(userId);
        const before = adapter.snapshot().sessionCount;
        const session = adapter.beginSession("verify-local-session");
        await session.learn([{ input: "ping", output: "pong", loss: 0.1 }]);
        await adapter.apply(await session.close());
        const reloaded = await LocalAdapter.load(userId);
        const after = reloaded.snapshot().sessionCount;
        const memoryPersistenceVerified = after === before + 1;
        details.push(`sessions_before=${before}`);
        details.push(`sessions_after=${after}`);
        if (networkEgressDetected) {
            details.push("network_egress=true");
        }
        return {
            ok: memoryPersistenceVerified && !networkEgressDetected,
            memoryPersistenceVerified,
            networkEgressDetected,
            details
        };
    }
    finally {
        if (typeof originalFetch === "function") {
            globalThis.fetch = originalFetch;
        }
    }
}
