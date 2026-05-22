export type CursorTurnRole = "user" | "assistant";

export interface CursorTurn {
  role: CursorTurnRole;
  content: string;
  timestamp: number;
  sessionHint: string;
}

function looksLikeTurn(item: unknown): item is Record<string, unknown> {
  if (!item || typeof item !== "object") {
    return false;
  }
  const obj = item as Record<string, unknown>;
  const roleOk =
    obj.role === "user" ||
    obj.role === "assistant" ||
    obj.type === "human" ||
    obj.type === "user" ||
    obj.type === "ai" ||
    obj.type === "assistant";
  const text =
    typeof obj.content === "string"
      ? obj.content
      : typeof obj.text === "string"
        ? obj.text
        : typeof obj.message === "string"
          ? obj.message
          : "";
  return roleOk && text.length > 0;
}

function roleFromItem(obj: Record<string, unknown>): CursorTurnRole {
  if (obj.role === "user" || obj.type === "human" || obj.type === "user") {
    return "user";
  }
  return "assistant";
}

function contentFromItem(obj: Record<string, unknown>): string {
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

function timestampFromItem(obj: Record<string, unknown>): number {
  const cand =
    obj.timestamp ?? obj.createdAt ?? obj.updatedAt ?? obj.updated_at ?? obj.time ?? obj.ts;
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
export function extractTurnsFromJson(data: unknown, sessionHint: string): CursorTurn[] {
  const turns: CursorTurn[] = [];

  const walk = (obj: unknown, sess: string): void => {
    if (obj === null || obj === undefined) {
      return;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (looksLikeTurn(item)) {
          const o = item as Record<string, unknown>;
          turns.push({
            role: roleFromItem(o),
            content: contentFromItem(o),
            timestamp: timestampFromItem(o),
            sessionHint: sess
          });
        } else {
          walk(item, sess);
        }
      }
      return;
    }
    if (typeof obj === "object") {
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        walk(val, sess || key);
      }
    }
  };

  walk(data, sessionHint);
  return turns;
}
