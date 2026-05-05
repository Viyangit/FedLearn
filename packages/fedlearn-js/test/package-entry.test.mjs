import test from "node:test";
import assert from "node:assert/strict";
import {
  formatEpsilon,
  buildHeatMapModel,
  normalizeIntensity,
  validateNoForbiddenFields,
  LocalAdapter
} from "../dist/index.js";

test("package entry is importable in node esm", () => {
  const value = formatEpsilon({ consumed: 0.25, total: 1.0 });
  assert.equal(value, "0.25ε / 1.00ε");
});

test("package entry re-exports heatmap helpers", () => {
  const model = buildHeatMapModel([[1, 2]]);
  const normalized = normalizeIntensity(model);
  assert.equal(normalized.cells[0].intensity, 0.5);
  assert.equal(normalized.cells[1].intensity, 1);
});

test("package entry re-exports storage guardrail helper", () => {
  assert.throws(() => validateNoForbiddenFields({ sscState: [1, 2, 3] }));
});

test("package entry supports explainer-style local adapter flow", async () => {
  const adapter = await LocalAdapter.load("user-explainer");
  const session = adapter.beginSession("session-a");
  await session.learn([{ input: "draft", output: "drafted", loss: 0.2 }]);
  const delta = await session.close();
  await adapter.apply(delta);
  const snapshot = adapter.snapshot();
  assert.equal(snapshot.userId, "user-explainer");
  assert.equal(snapshot.sessionCount >= 1, true);
});

