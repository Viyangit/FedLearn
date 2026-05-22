/**
 * Honest style extraction from message patterns only (not adapter weights).
 */
export function extractStyleHints(recentUserMessages) {
    if (recentUserMessages.length === 0) {
        return [];
    }
    const hints = [];
    const msgs = recentUserMessages.slice(-20);
    const avgLen = msgs.reduce((s, m) => s + m.length, 0) / msgs.length;
    if (avgLen < 80) {
        hints.push("User sends short, direct messages.");
    }
    if (avgLen > 300) {
        hints.push("User sends detailed, long-form messages.");
    }
    const listRatio = msgs.filter((m) => m.includes("\n-") || m.includes("\n*") || /\n\d+\./.test(m)).length /
        msgs.length;
    if (listRatio > 0.3) {
        hints.push("User frequently structures requests as lists.");
    }
    const questionRatio = msgs.filter((m) => m.trim().endsWith("?")).length / msgs.length;
    if (questionRatio > 0.5) {
        hints.push("User primarily asks questions rather than giving instructions.");
    }
    if (questionRatio < 0.1) {
        hints.push("User primarily gives direct instructions.");
    }
    const codeRatio = msgs.filter((m) => m.includes("```") ||
        m.includes("    ") ||
        /\b(function|const|let|def|class)\b/.test(m)).length / msgs.length;
    if (codeRatio > 0.3) {
        hints.push("User frequently includes code in messages.");
    }
    const formalSignals = ["please", "could you", "would you", "kindly"];
    const casualSignals = ["hey", "btw", "lol", "ok so", "basically"];
    const formalCount = msgs.filter((m) => formalSignals.some((s) => m.toLowerCase().includes(s))).length;
    const casualCount = msgs.filter((m) => casualSignals.some((s) => m.toLowerCase().includes(s))).length;
    if (formalCount > casualCount * 2) {
        hints.push("User communicates formally.");
    }
    if (casualCount > formalCount * 2) {
        hints.push("User communicates casually.");
    }
    return hints;
}
