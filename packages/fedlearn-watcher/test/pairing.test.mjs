import test from "node:test";
import assert from "node:assert/strict";
import { processTurnsIntoPairs, pairHash } from "../dist/pairing.js";

test("pairs user then assistant", () => {
  const sorted = [
    { role: "user", content: "long enough user", timestamp: 10, sessionHint: "a" },
    { role: "assistant", content: "long enough assistant reply ok", timestamp: 11, sessionHint: "a" }
  ];
  const consumed = new Set();
  const processed = new Set();
  const { pendingOut, newPairs } = processTurnsIntoPairs({
    sortedTurns: sorted,
    pending: null,
    consumedTurnFingerprints: consumed,
    processedPairHashes: processed,
    nowWallMs: 1000,
    opts: {
      minUserChars: 10,
      minAssistantChars: 20,
      pendingTtlWallMs: 30_000
    }
  });
  assert.equal(newPairs.length, 1);
  assert.equal(pendingOut, null);
  assert.equal(newPairs[0].pairH, pairHash(sorted[0].content, sorted[1].content));
});

test("pending expires", () => {
  const sorted = [{ role: "user", content: "long enough user", timestamp: 10, sessionHint: "a" }];
  const consumed = new Set();
  const processed = new Set();
  const { pendingOut, newPairs } = processTurnsIntoPairs({
    sortedTurns: sorted,
    pending: null,
    consumedTurnFingerprints: consumed,
    processedPairHashes: processed,
    nowWallMs: 1000,
    opts: {
      minUserChars: 10,
      minAssistantChars: 20,
      pendingTtlWallMs: 30_000
    }
  });
  assert.equal(newPairs.length, 0);
  assert.ok(pendingOut);
  const overdue = Date.now() + 40_000;
  const expired = processTurnsIntoPairs({
    sortedTurns: [],
    pending: pendingOut,
    consumedTurnFingerprints: consumed,
    processedPairHashes: processed,
    nowWallMs: overdue,
    opts: {
      minUserChars: 10,
      minAssistantChars: 20,
      pendingTtlWallMs: 30_000
    }
  });
  assert.equal(expired.pendingOut, null);
});
