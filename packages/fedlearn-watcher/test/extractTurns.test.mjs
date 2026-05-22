import test from "node:test";
import assert from "node:assert/strict";
import { extractTurnsFromJson } from "../dist/extractTurns.js";

test("extractTurns walks nested messages", () => {
  const blob = {
    nested: {
      msgs: [
        { role: "user", content: "hello", timestamp: 1e12 },
        { role: "assistant", content: "world", timestamp: 1e12 + 1 }
      ]
    }
  };
  const turns = extractTurnsFromJson(blob, "k");
  assert.equal(turns.length, 2);
  assert.equal(turns[0].role, "user");
  assert.equal(turns[1].role, "assistant");
});
