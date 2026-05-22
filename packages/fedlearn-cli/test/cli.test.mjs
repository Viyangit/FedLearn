import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const bin = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "fedlearn.mjs");

test("help prints dashboard hint", () => {
  const out = execFileSync(process.execPath, [bin, "help"], { encoding: "utf-8" });
  assert.match(out, /dashboard/i);
  assert.match(out, /watch/i);
});

test("-h matches help", () => {
  const out = execFileSync(process.execPath, [bin, "-h"], { encoding: "utf-8" });
  assert.match(out, /fedlearn/);
});
