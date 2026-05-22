import { LocalAdapter, macroProgress, personalisationPct } from "fedlearn-core";
function buildCompactContext(summary, pct, userInput) {
    const inferredTone = /\b(short|quick|brief|just)\b/i.test(userInput) ? "direct" : "friendly";
    const budgetRemaining = Math.max(0, summary.totalEpsilon - summary.consumedEpsilon);
    return (`[FedLearn local] sessions=${summary.sessionsRetained}, ` +
        `pattern_coverage=${pct.toFixed(2)}%, ` +
        `budgetRemaining=${budgetRemaining.toFixed(2)}ε, ` +
        `rank=${summary.autoAdjustedRankLabel}, tone_hint=${inferredTone}. ` +
        `Condition reply style lightly on tone_hint without inventing preferences.`);
}
/**
 * Guaranteed per-turn learning using LocalAdapter only (no MCP, no Cursor).
 * Every completed call persists one session via beginSession → learn → apply.
 */
export async function createGuaranteedLocalRunner(userId) {
    let adapter = await LocalAdapter.load(userId);
    let sessions = adapter.snapshot().sessionCount;
    let turnsInSession = 0;
    let pct = macroProgress(sessions);
    let turnIndex = 0;
    const syncFromDisk = async () => {
        adapter = await LocalAdapter.load(userId);
        sessions = adapter.snapshot().sessionCount;
        turnsInSession = 0;
        pct = personalisationPct({
            sessions,
            turnsInSession: 0,
            turnsPerSession: 1
        });
    };
    const runTurn = async (input) => {
        const { userInput, conversationIdPrefix = "guaranteed-local", onLog, reply } = input;
        turnIndex += 1;
        const startMicro = Date.now();
        turnsInSession += 1;
        pct = personalisationPct({
            sessions,
            turnsInSession,
            turnsPerSession: 1
        });
        onLog?.({
            turnIndex,
            flowStage: "micro_update",
            success: true,
            latencyMs: Date.now() - startMicro
        });
        const summary = adapter.memorySummary();
        const context = buildCompactContext(summary, pct, userInput);
        const startModel = Date.now();
        let replyText;
        try {
            replyText = reply
                ? await reply({ userInput, personalizationContext: context, adapter, pct })
                : `[fedlearn-local-echo] ${userInput}`;
            onLog?.({
                turnIndex,
                flowStage: "model_generate",
                success: true,
                latencyMs: Date.now() - startModel
            });
        }
        catch {
            onLog?.({
                turnIndex,
                flowStage: "model_generate",
                success: false,
                latencyMs: Date.now() - startModel
            });
            throw new Error("model_generate failed");
        }
        const startLearn = Date.now();
        try {
            const prefix = conversationIdPrefix.replace(/[^a-zA-Z0-9-_]/g, "") || "guaranteed-local";
            const session = adapter.beginSession(`${prefix}-${Date.now()}`);
            await session.learn([{ input: userInput, output: replyText }]);
            await adapter.apply(await session.close());
            adapter = await LocalAdapter.load(userId);
            sessions = adapter.snapshot().sessionCount;
            turnsInSession = 0;
            pct = personalisationPct({
                sessions,
                turnsInSession: 0,
                turnsPerSession: 1
            });
            onLog?.({
                turnIndex,
                flowStage: "learn_apply",
                success: true,
                latencyMs: Date.now() - startLearn
            });
        }
        catch {
            onLog?.({
                turnIndex,
                flowStage: "learn_apply",
                success: false,
                latencyMs: Date.now() - startLearn
            });
            throw new Error("learn_apply failed");
        }
        const snap = adapter.snapshot();
        return {
            reply: replyText,
            sessions: snap.sessionCount,
            turnsInSession: 0,
            personalizationPct: pct,
            consumedEpsilon: snap.budgetState.consumedEpsilon
        };
    };
    return { userId, runTurn, syncFromDisk };
}
