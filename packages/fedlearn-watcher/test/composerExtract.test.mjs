import test from "node:test";
import assert from "node:assert/strict";
import { turnsFromAiServiceGenerations } from "../dist/composerExtract.js";

test("composer generations expand to user + synth assistant", () => {
  const gens = [
    {
      unixMs: 1000,
      generationUUID: "u1",
      type: "composer",
      textDescription: "hello there this is long enough user text"
    }
  ];
  const turns = turnsFromAiServiceGenerations(gens, { synthAssistant: true });
  assert.equal(turns.length, 2);
  assert.equal(turns[0].role, "user");
  assert.equal(turns[1].role, "assistant");
  assert.ok(turns[1].content.includes("gen=u1"));
});

test("composer generations user-only without synth", () => {
  const gens = [{ unixMs: 1, generationUUID: "x", type: "composer", textDescription: "x".repeat(12) }];
  const turns = turnsFromAiServiceGenerations(gens, { synthAssistant: false });
  assert.equal(turns.length, 1);
  assert.equal(turns[0].role, "user");
});
