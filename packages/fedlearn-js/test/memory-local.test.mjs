import test from "node:test";
import assert from "node:assert/strict";
import { LocalAdapter, verifyLocalDataFlow } from "../dist/index.js";

test("local adapter persists session count across reload", async () => {
  const adapter = await LocalAdapter.load("memory-proof-user");
  const before = adapter.snapshot().sessionCount;
  const session = adapter.beginSession("memory-proof-session");
  await session.learn([{ input: "a", output: "b", loss: 0.2 }]);
  await adapter.apply(await session.close());

  const reloaded = await LocalAdapter.load("memory-proof-user");
  const after = reloaded.snapshot().sessionCount;
  assert.equal(after, before + 1);
});

test("verifyLocalDataFlow reports no network egress", async () => {
  const userId = `no-egress-${Math.random().toString(36).slice(2, 11)}`;
  const out = await verifyLocalDataFlow(userId);
  assert.equal(out.memoryPersistenceVerified, true);
  assert.equal(out.networkEgressDetected, false);
  assert.equal(out.ok, true);
});

test("session auto-commits after five learned prompts", async () => {
  const userId = "auto-commit-five-user";
  const adapter = await LocalAdapter.load(userId);
  const before = adapter.snapshot().sessionCount;
  const session = adapter.beginSession("auto-five");
  for (let i = 0; i < 5; i += 1) {
    await session.learn([{ input: `p-${i}`, output: `o-${i}`, loss: 0.1 }]);
  }
  const after = (await LocalAdapter.load(userId)).snapshot().sessionCount;
  assert.equal(after, before + 1);
});

