import { createHash } from "node:crypto";
export function turnFingerprint(t) {
    return createHash("sha256")
        .update(`${t.role}\n${t.content}\n${t.timestamp}\n${t.sessionHint}`)
        .digest("hex");
}
export function pairHash(user, assistant) {
    return createHash("sha256").update(`${user}\x00${assistant}`).digest("hex");
}
/**
 * Consume sorted turns producing learnable pairs with pending TTL (wall-clock).
 */
export function processTurnsIntoPairs(args) {
    const { sortedTurns, pending, consumedTurnFingerprints, processedPairHashes, nowWallMs = Date.now(), opts } = args;
    const newPairs = [];
    const newConsumedFingerprints = [];
    let pendingOut = pending ?? null;
    if (pendingOut && nowWallMs > pendingOut.deadlineWallMs) {
        pendingOut = null;
    }
    for (const turn of sortedTurns) {
        const fp = turnFingerprint(turn);
        if (consumedTurnFingerprints.has(fp)) {
            continue;
        }
        if (turn.role === "user") {
            if (pendingOut && nowWallMs > pendingOut.deadlineWallMs) {
                pendingOut = null;
            }
            pendingOut = {
                userContent: turn.content,
                deadlineWallMs: nowWallMs + opts.pendingTtlWallMs
            };
            consumedTurnFingerprints.add(fp);
            newConsumedFingerprints.push(fp);
            continue;
        }
        if (turn.role === "assistant") {
            if (pendingOut && nowWallMs > pendingOut.deadlineWallMs) {
                pendingOut = null;
            }
            if (pendingOut) {
                const u = pendingOut.userContent;
                const a = turn.content;
                pendingOut = null;
                consumedTurnFingerprints.add(fp);
                newConsumedFingerprints.push(fp);
                const pairH = pairHash(u, a);
                if (processedPairHashes.has(pairH)) {
                    continue;
                }
                if (u.length < opts.minUserChars || a.length < opts.minAssistantChars) {
                    continue;
                }
                newPairs.push({ user: u, assistant: a, pairH });
            }
            else {
                consumedTurnFingerprints.add(fp);
                newConsumedFingerprints.push(fp);
            }
        }
    }
    return { pendingOut, newPairs, newConsumedFingerprints };
}
