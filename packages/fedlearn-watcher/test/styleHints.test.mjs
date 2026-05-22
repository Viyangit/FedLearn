import test from "node:test";
import assert from "node:assert/strict";
import { extractStyleHints } from "../dist/styleHints.js";

test("extractStyleHints respects short message average", () => {
  const hints = extractStyleHints(Array(5).fill("hi"));
  assert.ok(hints.some((h) => h.includes("short")));
});

test("extractStyleHints detects lists", () => {
  const msgs = ["a\n- one\n- two", "b\n- x", "c\n* y"];
  const hints = extractStyleHints(msgs);
  assert.ok(hints.some((h) => h.includes("lists")));
});

test("extractStyleHints detects questions", () => {
  const msgs = ["why?", "what?", "how?"];
  const hints = extractStyleHints(msgs);
  assert.ok(hints.some((h) => h.includes("questions")));
});
