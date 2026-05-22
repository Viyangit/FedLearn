function looksLikeTurn(item) {
    if (!item || typeof item !== "object") {
        return false;
    }
    const obj = item;
    const roleOk = obj.role === "user" ||
        obj.role === "assistant" ||
        obj.type === "human" ||
        obj.type === "user" ||
        obj.type === "ai" ||
        obj.type === "assistant";
    const text = typeof obj.content === "string"
        ? obj.content
        : typeof obj.text === "string"
            ? obj.text
            : typeof obj.message === "string"
                ? obj.message
                : "";
    return roleOk && text.length > 0;
}
function roleFromItem(obj) {
    if (obj.role === "user" || obj.type === "human" || obj.type === "user") {
        return "user";
    }
    return "assistant";
}
function contentFromItem(obj) {
    const c = obj.content;
    if (typeof c === "string") {
        return c;
    }
    const t = obj.text;
    if (typeof t === "string") {
        return t;
    }
    const m = obj.message;
    if (typeof m === "string") {
        return m;
    }
    return "";
}
function timestampFromItem(obj) {
    const cand = obj.timestamp ?? obj.createdAt ?? obj.updatedAt ?? obj.updated_at ?? obj.time ?? obj.ts;
    if (typeof cand === "number" && Number.isFinite(cand)) {
        return cand > 1e12 ? cand : cand * 1000;
    }
    if (typeof cand === "string") {
        const n = Number(cand);
        if (Number.isFinite(n)) {
            return n > 1e12 ? n : n * 1000;
        }
        const parsed = Date.parse(cand);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return Date.now();
}
/**
 * Depth-first walk of JSON looking for chat-like message objects.
 */
export function extractTurnsFromJson(data, sessionHint) {
    const turns = [];
    const walk = (obj, sess) => {
        if (obj === null || obj === undefined) {
            return;
        }
        if (Array.isArray(obj)) {
            for (const item of obj) {
                if (looksLikeTurn(item)) {
                    const o = item;
                    turns.push({
                        role: roleFromItem(o),
                        content: contentFromItem(o),
                        timestamp: timestampFromItem(o),
                        sessionHint: sess
                    });
                }
                else {
                    walk(item, sess);
                }
            }
            return;
        }
        if (typeof obj === "object") {
            for (const [key, val] of Object.entries(obj)) {
                walk(val, sess || key);
            }
        }
    };
    walk(data, sessionHint);
    return turns;
}
