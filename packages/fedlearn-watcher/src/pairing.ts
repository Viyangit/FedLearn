import { createHash } from "node:crypto";
import type { CursorTurn } from "./extractTurns.js";

export interface PendingTurn {
  userContent: string;
  /** Wall clock deadline; pending dropped after this moment */
  deadlineWallMs: number;
}

export function turnFingerprint(t: CursorTurn): string {
  return createHash("sha256")
    .update(`${t.role}\n${t.content}\n${t.timestamp}\n${t.sessionHint}`)
    .digest("hex");
}

export function pairHash(user: string, assistant: string): string {
  return createHash("sha256").update(`${user}\x00${assistant}`).digest("hex");
}

export interface PairingOptions {
  minUserChars: number;
  minAssistantChars: number;
  pendingTtlWallMs: number;
}

export interface PairLearnEvent {
  user: string;
  assistant: string;
  pairH: string;
}

/**
 * Consume sorted turns producing learnable pairs with pending TTL (wall-clock).
 */
export function processTurnsIntoPairs(args: {
  sortedTurns: CursorTurn[];
  pending: PendingTurn | null;
  consumedTurnFingerprints: Set<string>;
  processedPairHashes: Set<string>;
  nowWallMs?: number;
  opts: PairingOptions;
}): { pendingOut: PendingTurn | null; newPairs: PairLearnEvent[]; newConsumedFingerprints: string[] } {
  const {
    sortedTurns,
    pending,
    consumedTurnFingerprints,
    processedPairHashes,
    nowWallMs = Date.now(),
    opts
  } = args;

  const newPairs: PairLearnEvent[] = [];
  const newConsumedFingerprints: string[] = [];

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
      } else {
        consumedTurnFingerprints.add(fp);
        newConsumedFingerprints.push(fp);
      }
    }
  }

  return { pendingOut, newPairs, newConsumedFingerprints };
}
