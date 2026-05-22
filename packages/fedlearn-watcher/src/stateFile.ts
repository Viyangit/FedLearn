import * as fs from "node:fs";
import * as path from "node:path";

const STATE_VERSION = 1;
const MAX_HASHES = 2000;

export interface WatcherStateFile {
  version: number;
  processedPairHashes: string[];
  consumedTurnFingerprints: string[];
  recentUserMessages: string[];
  /** Optional pending user line (survives watcher restarts briefly) */
  pendingUserContent?: string | null;
  pendingDeadlineWallMs?: number | null;
}

const defaultState = (): WatcherStateFile => ({
  version: STATE_VERSION,
  processedPairHashes: [],
  consumedTurnFingerprints: [],
  recentUserMessages: []
});

export function watcherStatePath(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".fedlearn", "watcher-state.json");
}

export function loadWatcherState(workspaceRoot: string): WatcherStateFile {
  const fp = watcherStatePath(workspaceRoot);
  try {
    if (!fs.existsSync(fp)) {
      return defaultState();
    }
    const raw = fs.readFileSync(fp, "utf8");
    const parsed = JSON.parse(raw) as Partial<WatcherStateFile>;
    return {
      version: parsed.version ?? STATE_VERSION,
      processedPairHashes: Array.isArray(parsed.processedPairHashes) ? parsed.processedPairHashes : [],
      consumedTurnFingerprints: Array.isArray(parsed.consumedTurnFingerprints)
        ? parsed.consumedTurnFingerprints
        : [],
      recentUserMessages: Array.isArray(parsed.recentUserMessages) ? parsed.recentUserMessages : [],
      pendingUserContent: parsed.pendingUserContent ?? null,
      pendingDeadlineWallMs:
        typeof parsed.pendingDeadlineWallMs === "number" ? parsed.pendingDeadlineWallMs : null
    };
  } catch {
    return defaultState();
  }
}

export function saveWatcherState(workspaceRoot: string, state: WatcherStateFile): void {
  const dir = path.join(workspaceRoot, ".fedlearn");
  fs.mkdirSync(dir, { recursive: true });
  state.processedPairHashes = state.processedPairHashes.slice(-MAX_HASHES);
  state.consumedTurnFingerprints = state.consumedTurnFingerprints.slice(-MAX_HASHES);
  state.recentUserMessages = state.recentUserMessages.slice(-20);
  fs.writeFileSync(watcherStatePath(workspaceRoot), JSON.stringify(state, null, 2), "utf8");
}
