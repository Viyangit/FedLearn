import assert from "node:assert/strict";
import test from "node:test";
import { FedLearnAdapter } from "../dist/index.js";

test("constructs with defaults", () => {
  const a = new FedLearnAdapter();
  assert.strictEqual(a.layerCount, 8);
  assert.strictEqual(a.turnCount, 0);
  assert.strictEqual(a.dModel, 512);
});

test("learnTurn returns finite positive loss", async () => {
  const a = new FedLearnAdapter();
  const input = new Float32Array(512).fill(0.1);
  const target = new Float32Array(512).fill(0.5);
  const r = await a.learnTurn(input, target);
  assert.ok(Number.isFinite(r.loss) && r.loss > 0);
  assert.strictEqual(r.turnCount, 1);
});

test("loss decreases over 10 turns (same input/target)", async () => {
  const a = new FedLearnAdapter({ learningRate: 0.05 });
  const input = new Float32Array(512).fill(0.1);
  const target = new Float32Array(512).fill(0.5);
  const losses = [];
  for (let i = 0; i < 10; i++) {
    losses.push((await a.learnTurn(input, target)).loss);
  }
  assert.ok(
    losses[9] < losses[0],
    `loss should decrease: ${losses[0]} → ${losses[9]}`
  );
});

test("turnCount increments, consolidate resets to 0", async () => {
  const a = new FedLearnAdapter();
  const input = new Float32Array(512).fill(0.1);
  const target = new Float32Array(512).fill(0.5);
  await a.learnTurn(input, target);
  await a.learnTurn(input, target);
  assert.strictEqual(a.turnCount, 2);
  a.consolidate();
  assert.strictEqual(a.turnCount, 0);
});

test("EWC has no effect before first consolidate (loss comparable to no-EWC)", async () => {
  const input = new Float32Array(512).fill(0.1);
  const target = new Float32Array(512).fill(0.5);
  const a1 = new FedLearnAdapter({ ewcLambda: 0 });
  const a2 = new FedLearnAdapter({ ewcLambda: 400 });
  const l1 = (await a1.learnTurn(input, target)).loss;
  const l2 = (await a2.learnTurn(input, target)).loss;
  assert.ok(Math.abs(l1 - l2) / l1 < 0.05);
});

test("EWC consolidates Fisher into checkpoint (blob grows after consolidate)", async () => {
  const input = new Float32Array(512).fill(0.1);
  const target = new Float32Array(512).fill(0.5);
  const b = new FedLearnAdapter({ ewcLambda: 400, learningRate: 0.05 });
  for (let i = 0; i < 8; i++) {
    await b.learnTurn(input, target);
  }
  const before = b.serialize();
  b.consolidate();
  const after = b.serialize();
  assert.ok(
    after.length > before.length,
    "checkpoint should include serialized EwcState after consolidate"
  );
});

test("serialize / deserialize roundtrip", async () => {
  const a = new FedLearnAdapter({ learningRate: 0.05 });
  const input = new Float32Array(512).fill(0.1);
  await a.learnTurn(input, new Float32Array(512).fill(0.5));
  const buf = a.serialize();
  assert.ok(buf.length > 0);
  const b = FedLearnAdapter.deserialize(buf);
  assert.strictEqual(b.layerCount, a.layerCount);
  assert.strictEqual(b.dModel, a.dModel);
  const o1 = a.forward(input, 0);
  const o2 = b.forward(input, 0);
  for (let i = 0; i < 10; i++) {
    assert.ok(Math.abs(o1[i] - o2[i]) < 1e-5, `output mismatch at ${i}`);
  }
});

test("custom config respected", async () => {
  const small = new FedLearnAdapter({ dModel: 64, numLayers: 2, rank: 2 });
  assert.strictEqual(small.layerCount, 2);
  assert.strictEqual(small.dModel, 64);
  const si = new Float32Array(64).fill(0.1);
  const st = new Float32Array(64).fill(0.5);
  const r = await small.learnTurn(si, st);
  assert.ok(Number.isFinite(r.loss));
});
