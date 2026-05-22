import test from "node:test";
import assert from "node:assert/strict";
import {
  adaptivePct,
  macroProgress,
  sessionDelta
} from "../dist/index.js";

test("adaptivePct is zero for non-positive sessions", () => {
  assert.equal(adaptivePct(0), 0);
  assert.equal(adaptivePct(-1), 0);
});

test("adaptivePct midpoint default ~50% at 15 sessions", () => {
  const p = adaptivePct(15);
  assert.ok(Math.abs(p - 50) < 0.05, `expected ~50 at s=15, got ${p}`);
});

test("macroProgress matches adaptivePct for integers", () => {
  for (const s of [0, 1, 5, 10, 15, 20]) {
    assert.equal(macroProgress(s), adaptivePct(s));
  }
});

test("sessionDelta is non-negative when sessions increase", () => {
  assert.ok(sessionDelta(0, 1) >= 0);
  assert.ok(sessionDelta(5, 10) > 0);
});
