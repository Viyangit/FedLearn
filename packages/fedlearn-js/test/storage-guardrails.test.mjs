import test from "node:test";
import assert from "node:assert/strict";
import { validateNoForbiddenFields } from "../dist/browser/adapter_store.js";

test("forbidden session fields are rejected", () => {
  assert.throws(() => {
    validateNoForbiddenFields({ userId: "u1", sessionState: {} });
  });
});

test("adapter-only record passes", () => {
  assert.doesNotThrow(() => {
    validateNoForbiddenFields({ userId: "u1", rank: 8, version: 1 });
  });
});

