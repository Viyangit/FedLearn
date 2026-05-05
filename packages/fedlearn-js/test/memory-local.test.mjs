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
  const out = await verifyLocalDataFlow("no-egress-user");
  assert.equal(out.memoryPersistenceVerified, true);
  assert.equal(out.networkEgressDetected, false);
  assert.equal(out.ok, true);
});

