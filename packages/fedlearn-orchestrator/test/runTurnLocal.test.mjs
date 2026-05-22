import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { LocalAdapter } from "fedlearn-core";
import { createGuaranteedLocalRunner } from "../dist/runTurnLocal.js";

test("every guaranteed local turn increments session by one", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fedlearn-gcli-"));
  const prev = process.env.FEDLEARN_LOCAL_STORE;
  process.env.FEDLEARN_LOCAL_STORE = path.join(dir, "store.json");
  const userId = `gcli-${Date.now()}`;

  try {
    const before = await LocalAdapter.load(userId);
    const s0 = before.snapshot().sessionCount;

    const runner = await createGuaranteedLocalRunner(userId);
    assert.equal(runner.userId, userId);

    for (let i = 0; i < 10; i += 1) {
      const out = await runner.runTurn({ userInput: `line-${i}`, conversationIdPrefix: `turn-${i}` });
      assert.equal(out.sessions, s0 + i + 1);
    }

    const after = await LocalAdapter.load(userId);
    assert.equal(after.snapshot().sessionCount, s0 + 10);
    assert.ok(after.snapshot().budgetState.consumedEpsilon > 0);
  } finally {
    if (prev === undefined) {
      delete process.env.FEDLEARN_LOCAL_STORE;
    } else {
      process.env.FEDLEARN_LOCAL_STORE = prev;
    }
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("syncFromDisk reloads persisted session count", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fedlearn-gcli-sync-"));
  const prev = process.env.FEDLEARN_LOCAL_STORE;
  process.env.FEDLEARN_LOCAL_STORE = path.join(dir, "store.json");
  const userId = `gcli-sync-${Date.now()}`;

  try {
    const other = await createGuaranteedLocalRunner(userId);
    await other.runTurn({ userInput: "first", conversationIdPrefix: "a" });

    const runner = await createGuaranteedLocalRunner(userId);
    await runner.syncFromDisk();
    const out = await runner.runTurn({ userInput: "second", conversationIdPrefix: "b" });
    assert.equal(out.sessions, 2);
  } finally {
    if (prev === undefined) {
      delete process.env.FEDLEARN_LOCAL_STORE;
    } else {
      process.env.FEDLEARN_LOCAL_STORE = prev;
    }
    await fs.rm(dir, { recursive: true, force: true });
  }
});
