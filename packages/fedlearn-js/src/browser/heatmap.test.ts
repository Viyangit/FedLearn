import test from "node:test";
import assert from "node:assert/strict";

import { buildHeatMapModel, normalizeIntensity } from "./heatmap";

test("buildHeatMapModel maps matrix to cells", () => {
  const model = buildHeatMapModel([
    [1, 2],
    [3, 4]
  ]);
  assert.equal(model.layers, 2);
  assert.equal(model.heads, 2);
  assert.equal(model.cells.length, 4);
});

test("normalizeIntensity scales to [0,1]", () => {
  const model = buildHeatMapModel([[2, 4]]);
  const norm = normalizeIntensity(model);
  const vals = norm.cells.map((c) => c.intensity);
  assert.equal(vals[0], 0.5);
  assert.equal(vals[1], 1);
});

