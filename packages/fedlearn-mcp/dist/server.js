import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { LocalAdapter, macroProgress, personalisationPct } from "fedlearn-core";
const liveStateByConversation = new Map();
const seenTurnIdsByConversation = new Map();
const LIVE_STATE_TTL_MS = 15 * 60 * 1000;
const DEBUG_RUN_ID = "initial-debug";
/** Optional local ingest; off by default so MCP startup never spams stderr. */
function debugLog(hypothesisId, location, message, data) {
    if (envVar("FEDLEARN_MCP_AGENT_LOG") !== "1") {
        return;
    }
    fetch("http://127.0.0.1:7308/ingest/9a86ed33-978b-4985-b204-6ebf18da78c6", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a85381" },
        body: JSON.stringify({
            sessionId: "a85381",
            runId: DEBUG_RUN_ID,
            hypothesisId,
            location,
            message,
            data,
            timestamp: Date.now()
        })
    }).catch(() => { });
}
function envVar(name) {
    // Avoid relying on NodeJS type globals; we read from globalThis.
    const proc = globalThis.process;
    return proc?.env?.[name];
}
function conversationKey(userId, conversationId) {
    return `${userId}::${conversationId}`;
}
async function ensureLiveState(userId, conversationId) {
    const key = conversationKey(userId, conversationId);
    const existing = liveStateByConversation.get(key);
    if (existing) {
        // #region agent log
        debugLog("H2", "server.ts:ensureLiveState(existing)", "reusing live state", {
            key,
            userId,
            conversationId,
            sessions: existing.sessions,
            turnsInSession: existing.turnsInSession,
            pct: existing.pct
        });
        // #endregion
        existing.lastSeenMs = Date.now();
        return existing;
    }
    const adapter = await LocalAdapter.load(userId);
    const snapshot = adapter.snapshot();
    const sessions = snapshot.sessionCount;
    const seeded = {
        adapter,
        sessions,
        turnsInSession: 0,
        pct: macroProgress(sessions),
        lastSeenMs: Date.now()
    };
    // #region agent log
    debugLog("H3", "server.ts:ensureLiveState(new)", "created live state from adapter snapshot", {
        key,
        userId,
        conversationId,
        sessions,
        consumedEpsilon: snapshot.budgetState.consumedEpsilon
    });
    // #endregion
    liveStateByConversation.set(key, seeded);
    return seeded;
}
function inferInputStyle(latestInput) {
    const input = (latestInput ?? "").trim();
    if (!input) {
        return {
            detailPreference: "balanced",
            formatPreference: "plain",
            toneHint: "friendly"
        };
    }
    const tokenCount = input.split(/\s+/).filter(Boolean).length;
    const hasListSignals = /(\bsteps?\b|\blist\b|\bpoints?\b|^\d+\.)/i.test(input);
    const hasFormalSignals = /(\btherefore\b|\bkindly\b|\bregarding\b|\bplease\b)/i.test(input);
    const hasDirectSignals = /(\bshort\b|\bquick\b|\bbrief\b|\bjust\b)/i.test(input);
    const detailPreference = tokenCount < 8 || hasDirectSignals ? "brief" : tokenCount > 24 ? "detailed" : "balanced";
    const formatPreference = hasListSignals ? "step-by-step" : tokenCount > 18 ? "bullet" : "plain";
    const toneHint = hasFormalSignals ? "formal" : hasDirectSignals ? "direct" : "friendly";
    return { detailPreference, formatPreference, toneHint };
}
async function getPersonalizationContext(args) {
    const state = await ensureLiveState(args.userId, args.conversationId);
    const summary = state.adapter.memorySummary();
    const personalization = state.pct;
    const budgetRemaining = Math.max(0, summary.totalEpsilon - summary.consumedEpsilon);
    const confidence = state.sessions >= 12
        ? "high"
        : state.sessions >= 4
            ? "medium"
            : "low";
    const inferred = inferInputStyle(args.latestInput);
    const fallbackNote = confidence === "low"
        ? "Low confidence: keep response neutral, avoid strong style assumptions."
        : "Confidence sufficient: align response style with hints below.";
    const styleContext = `FedLearn context for conversation=${args.conversationId}: ` +
        `sessions=${state.sessions}, pattern_coverage=${personalization.toFixed(2)}%, ` +
        `budgetRemaining=${budgetRemaining.toFixed(2)}ε, rank=${summary.autoAdjustedRankLabel}, ` +
        `tone=${inferred.toneHint}, format=${inferred.formatPreference}, detail=${inferred.detailPreference}, ` +
        `confidence=${confidence}. ${fallbackNote}`;
    return {
        content: [{ type: "text", text: styleContext }]
    };
}
async function learnFromTurn(args) {
    const state = await ensureLiveState(args.userId, args.conversationId);
    const key = conversationKey(args.userId, args.conversationId);
    if (args.turnId) {
        const seen = seenTurnIdsByConversation.get(key) ?? new Set();
        if (seen.has(args.turnId)) {
            const summary = state.adapter.memorySummary();
            return {
                content: [
                    {
                        type: "text",
                        text: `FedLearn ignored duplicate turnId and kept existing state. ` +
                            `sessionsRetained=${state.sessions}, ` +
                            `pattern_coverage=${state.pct.toFixed(2)}%, ` +
                            `budget=${summary.consumedEpsilon.toFixed(2)}ε/${summary.totalEpsilon.toFixed(2)}ε, ` +
                            `rank=${summary.autoAdjustedRankLabel}`
                    }
                ]
            };
        }
        seen.add(args.turnId);
        seenTurnIdsByConversation.set(key, seen);
    }
    const session = state.adapter.beginSession(`${args.conversationId}-${Date.now()}`);
    await session.learn([{ input: args.input, output: args.output }]);
    await state.adapter.apply(await session.close());
    const snapshot = state.adapter.snapshot();
    state.sessions = snapshot.sessionCount;
    state.turnsInSession = 0;
    state.pct = macroProgress(state.sessions);
    const summary = state.adapter.memorySummary();
    // #region agent log
    debugLog("H4", "server.ts:learnFromTurn(post-apply)", "learn/apply completed and persisted", {
        userId: args.userId,
        conversationId: args.conversationId,
        sessions: state.sessions,
        consumedEpsilon: summary.consumedEpsilon,
        pct: state.pct
    });
    // #endregion
    return {
        content: [
            {
                type: "text",
                text: `FedLearn learned and applied this turn. ` +
                    `sessionsRetained=${state.sessions}, ` +
                    `pattern_coverage=${state.pct.toFixed(2)}%, ` +
                    `budget=${summary.consumedEpsilon.toFixed(2)}ε/${summary.totalEpsilon.toFixed(2)}ε, ` +
                    `rank=${summary.autoAdjustedRankLabel}`
            }
        ]
    };
}
async function preTurn(args) {
    const state = await ensureLiveState(args.userId, args.conversationId);
    state.turnsInSession += 1;
    state.pct = personalisationPct({
        sessions: state.sessions,
        turnsInSession: state.turnsInSession,
        turnsPerSession: 1
    });
    const summary = state.adapter.memorySummary();
    return {
        content: [
            {
                type: "text",
                text: `FedLearn pre-turn progress. ` +
                    `sessionsRetained=${state.sessions}, turnsInSession=${state.turnsInSession}, ` +
                    `pattern_coverage=${state.pct.toFixed(2)}%, ` +
                    `budget=${summary.consumedEpsilon.toFixed(2)}ε/${summary.totalEpsilon.toFixed(2)}ε, ` +
                    `rank=${summary.autoAdjustedRankLabel}`
            }
        ]
    };
}
async function flushConversation(args) {
    const state = await ensureLiveState(args.userId, args.conversationId);
    const summary = state.adapter.memorySummary();
    return {
        content: [
            {
                type: "text",
                text: `FedLearn is already applying every turn. ` +
                    `sessionsRetained=${state.sessions}, ` +
                    `pattern_coverage=${state.pct.toFixed(2)}%, ` +
                    `budget=${summary.consumedEpsilon.toFixed(2)}ε/${summary.totalEpsilon.toFixed(2)}ε, ` +
                    `rank=${summary.autoAdjustedRankLabel}`
            }
        ]
    };
}
const server = new McpServer({ name: "fedlearn", version: "1.0.0" }, {
    instructions: "Strict flow required for each response: " +
        "1) call pre_turn first for immediate progress update, " +
        "2) call get_personalization_context before drafting the final answer, " +
        "3) condition the answer style/format/detail on the returned context, " +
        "4) after final answer generation, call learn_from_turn with the user input and assistant output. " +
        "If context retrieval fails, continue with neutral style and still call learn_from_turn."
});
server.registerTool("pre_turn", {
    title: "Pre-turn micro progress update",
    description: "Increments within-session progress immediately so personalization percentage moves before post-turn apply.",
    inputSchema: z.object({
        userId: z.string().optional().describe("Stable user id for local persistence"),
        conversationId: z.string().describe("Stable conversation/thread id"),
        latestInput: z
            .string()
            .optional()
            .describe("Latest user prompt for optional pre-answer style hinting"),
        turnId: z.string().optional().describe("Optional turn id for tracing")
    })
}, async ({ userId, conversationId, latestInput, turnId }) => {
    const resolvedUserId = userId ?? envVar("FEDLEARN_USER_ID") ?? "fedlearn-mcp-user";
    // #region agent log
    debugLog("H1", "server.ts:tool(pre_turn)", "pre_turn tool invoked", {
        inputUserId: userId ?? null,
        resolvedUserId,
        conversationId,
        latestInputLen: latestInput?.length ?? 0
    });
    // #endregion
    return preTurn({ userId: resolvedUserId, conversationId, latestInput, turnId });
});
server.registerTool("get_personalization_context", {
    title: "Get compact personalization context before answering",
    description: "Returns moderate-token local style context (tone/format/detail/confidence) derived from prior interactions.",
    inputSchema: z.object({
        userId: z.string().optional().describe("Stable user id for local persistence"),
        conversationId: z.string().describe("Stable conversation/thread id"),
        latestInput: z
            .string()
            .optional()
            .describe("Latest user prompt to refine context inference without excessive token usage"),
        turnId: z.string().optional().describe("Optional turn id for tracing")
    })
}, async ({ userId, conversationId, latestInput, turnId }) => {
    const resolvedUserId = userId ?? envVar("FEDLEARN_USER_ID") ?? "fedlearn-mcp-user";
    // #region agent log
    debugLog("H1", "server.ts:tool(get_personalization_context)", "context tool invoked", {
        inputUserId: userId ?? null,
        resolvedUserId,
        conversationId,
        latestInputLen: latestInput?.length ?? 0
    });
    // #endregion
    return getPersonalizationContext({
        userId: resolvedUserId,
        conversationId,
        latestInput,
        turnId
    });
});
server.registerTool("learn_from_turn", {
    title: "Learn from a conversation turn after answering",
    description: "Writes a post-answer learning update from the provided user prompt and assistant response.",
    inputSchema: z.object({
        userId: z.string().optional().describe("Stable user id for local persistence"),
        conversationId: z.string().describe("Stable conversation/thread id"),
        input: z.string().describe("The user's message"),
        output: z.string().describe("The assistant's reply"),
        turnId: z.string().optional().describe("Optional idempotency key for retry-safe writes")
    })
}, async ({ userId, conversationId, input, output, turnId }) => {
    const resolvedUserId = userId ?? envVar("FEDLEARN_USER_ID") ?? "fedlearn-mcp-user";
    // #region agent log
    debugLog("H1", "server.ts:tool(learn_from_turn)", "learn_from_turn tool invoked", {
        inputUserId: userId ?? null,
        resolvedUserId,
        conversationId,
        inputLen: input.length,
        outputLen: output.length
    });
    // #endregion
    return learnFromTurn({ userId: resolvedUserId, conversationId, input, output, turnId });
});
server.registerTool("flush_conversation", {
    title: "Flush leftover interactions for a conversation",
    description: "Returns the current state and clears ephemeral turns-in-session cache.",
    inputSchema: z.object({
        userId: z.string().optional(),
        conversationId: z.string()
    })
}, async ({ userId, conversationId }) => {
    const resolvedUserId = userId ?? envVar("FEDLEARN_USER_ID") ?? "fedlearn-mcp-user";
    const result = await flushConversation({ userId: resolvedUserId, conversationId });
    const key = conversationKey(resolvedUserId, conversationId);
    const existing = liveStateByConversation.get(key);
    if (existing) {
        existing.turnsInSession = 0;
        existing.pct = macroProgress(existing.sessions);
    }
    return result;
});
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of liveStateByConversation.entries()) {
        if (now - value.lastSeenMs > LIVE_STATE_TTL_MS) {
            liveStateByConversation.delete(key);
            seenTurnIdsByConversation.delete(key);
        }
    }
}, 60 * 1000);
// #region agent log
debugLog("H5", "server.ts:startup", "mcp server module initialized", {
    hasFetch: typeof fetch === "function",
    envUserId: envVar("FEDLEARN_USER_ID") ?? null
});
// #endregion
// Connect over stdio for local process-spawned MCP clients.
await server.connect(new StdioServerTransport());
