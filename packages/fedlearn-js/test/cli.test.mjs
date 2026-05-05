import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { LocalAdapter } from "../dist/index.js";

const thisDir = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(thisDir, "../bin/fedlearn-core.mjs");

test("cli default command renders dashboard panel", () => {
  const out = execFileSync("node", [cliPath], {
    encoding: "utf-8",
    env: { ...process.env, FEDLEARN_USER_ID: "cli-test-render" }
  });
  assert.match(out, /Your AI Memory/);
  assert.match(out, /Personal style learned/);
  assert.match(out, /Never leaves this device/);
});

test("cli default command shows 0 percent personalization for zero sessions", () => {
  const out = execFileSync("node", [cliPath], {
    encoding: "utf-8",
    env: { ...process.env, FEDLEARN_USER_ID: "cli-test-zero" }
  });
  assert.match(out, /0% personalised/);
});

test("cli personalization increases after retained sessions", async () => {
  const userId = "cli-test-growth";
  const adapter = await LocalAdapter.load(userId);
  const session = adapter.beginSession("growth-session");
  await session.learn([{ input: "x", output: "y", loss: 0.1 }]);
  await adapter.apply(await session.close());
  const out = execFileSync("node", [cliPath], {
    encoding: "utf-8",
    env: { ...process.env, FEDLEARN_USER_ID: userId }
  });
  assert.doesNotMatch(out, /0% personalised/);
});

test("cli health command returns json", () => {
  const out = execFileSync("node", [cliPath, "health"], { encoding: "utf-8" });
  const parsed = JSON.parse(out);
  assert.equal(parsed.package, "fedlearn-core");
  assert.equal(parsed.cli, "ok");
});

test("cli verify-local command returns passing status", () => {
  const out = execFileSync("node", [cliPath, "verify-local"], { encoding: "utf-8" });
  const parsed = JSON.parse(out);
  assert.equal(parsed.ok, true);
});

