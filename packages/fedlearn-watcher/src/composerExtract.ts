import type { CursorTurn } from "./extractTurns.js";

const DEFAULT_SYNTH =
  "[FedLearn watcher] Assistant body was not found in local Cursor SQLite for this workspace. " +
  "Only the user prompt is persisted in aiService.generations; enable real paired storage when Cursor exposes it.";

export interface AiServiceGenerationRow {
  unixMs?: number;
  generationUUID?: string;
  type?: string;
  textDescription?: string;
}

function envSynthEnabled(): boolean {
  const v = process.env.FEDLEARN_WATCHER_SYNTH_ASSISTANT;
  if (v === "0" || v === "false") {
    return false;
  }
  return true;
}

/**
 * Cursor workspace `aiService.generations`: typically **user** composer prompts only.
 * When `synthAssistant` is true (default), inject a synthetic assistant turn so FedLearn can run learn/apply.
 */
export function turnsFromAiServiceGenerations(
  rawJson: unknown,
  options?: { synthAssistant?: boolean }
): CursorTurn[] {
  const synthAssistant = options?.synthAssistant ?? envSynthEnabled();
  if (!Array.isArray(rawJson)) {
    return [];
  }

  const rows = rawJson as AiServiceGenerationRow[];
  const filtered = rows
    .filter((r) => r && r.type === "composer" && typeof r.textDescription === "string" && r.textDescription.trim())
    .map((r) => ({
      unixMs: typeof r.unixMs === "number" ? r.unixMs : Date.now(),
      uuid: typeof r.generationUUID === "string" ? r.generationUUID : "unknown",
      text: r.textDescription!.trim()
    }))
    .sort((a, b) => a.unixMs - b.unixMs);

  const turns: CursorTurn[] = [];
  for (const g of filtered) {
    turns.push({
      role: "user",
      content: g.text,
      timestamp: g.unixMs,
      sessionHint: "aiService.generations"
    });
    if (synthAssistant) {
      turns.push({
        role: "assistant",
        content: `${DEFAULT_SYNTH} gen=${g.uuid}`,
        timestamp: g.unixMs + 1,
        sessionHint: "aiService.generations+synth"
      });
    }
  }

  return turns;
}
