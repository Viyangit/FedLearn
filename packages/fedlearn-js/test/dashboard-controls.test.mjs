import test from "node:test";
import assert from "node:assert/strict";
import { pauseContributions, resumeContributions, toggleContributions } from "../dist/index.js";

test("pause and resume helpers update contribution control state", () => {
  const initial = { contributionEnabled: true, pausedAtMs: null };
  const paused = pauseContributions(initial, 12345);
  assert.equal(paused.contributionEnabled, false);
  assert.equal(paused.pausedAtMs, 12345);

  const resumed = resumeContributions(paused);
  assert.equal(resumed.contributionEnabled, true);
  assert.equal(resumed.pausedAtMs, null);
});

test("toggle helper flips state in both directions", () => {
  const initial = { contributionEnabled: true, pausedAtMs: null };
  const toggledOff = toggleContributions(initial, 42);
  assert.equal(toggledOff.contributionEnabled, false);
  assert.equal(toggledOff.pausedAtMs, 42);

  const toggledOn = toggleContributions(toggledOff, 100);
  assert.equal(toggledOn.contributionEnabled, true);
  assert.equal(toggledOn.pausedAtMs, null);
});

