import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { LocalAdapter, adaptivePct } from "fedlearn-core";
import { renderDashboard } from "../src/dashboard.mjs";

const thisDir = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(thisDir, "../bin/fedlearn-ui.mjs");

test("adaptive pct is zero for zero sessions", () => {
  assert.equal(adaptivePct(0), 0);
});

test("dashboard render reflects explainer fields", () => {
  const text = renderDashboard({
    sessionsRetained: 0,
    consumedEpsilon: 0,
    totalEpsilon: 8,
    contributionEnabled: true,
    autoAdjustedRankLabel: "r=4 (auto-adjusted)"
  });
  assert.match(text, /Your AI Memory/);
  assert.match(text, /Pattern coverage/);
  assert.match(text, /No sessions recorded yet/);
});

test("one-shot ui command renders and exits", () => {
  const out = execFileSync("node", [cliPath, "--once", "--user-id", "fedlearn-ui-once"], {
    encoding: "utf-8"
  });
  assert.match(out, /Your AI Memory/);
});

test("refresh source changes with retained sessions", async () => {
  const userId = "fedlearn-ui-growth";
  const adapter = await LocalAdapter.load(userId);
  const before = adapter.memorySummary().sessionsRetained;
  const session = adapter.beginSession("ui-growth");
  await session.learn([{ input: "a", output: "b", loss: 0.1 }]);
  await adapter.apply(await session.close());
  const after = (await LocalAdapter.load(userId)).memorySummary().sessionsRetained;
  assert.equal(after, before + 1);
});
