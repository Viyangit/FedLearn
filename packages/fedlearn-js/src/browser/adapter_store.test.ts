import test from "node:test";
import assert from "node:assert/strict";

type ValidateFn = (record: Record<string, unknown>) => void;

// Minimal copy of guard behavior for node-side smoke validation.
const FORBIDDEN_FIELDS = ["sessionState", "sessionGradients", "rawInteractions", "sscState"];
const validateNoForbiddenFields: ValidateFn = (record) => {
  for (const field of FORBIDDEN_FIELDS) {
    if (field in record) {
      throw new Error(`Forbidden persistence field detected: ${field}`);
    }
  }
};

test("forbidden session fields are blocked", () => {
  assert.throws(() => {
    validateNoForbiddenFields({ userId: "u1", sessionState: {} });
  });
});

test("safe adapter-like record passes guard", () => {
  assert.doesNotThrow(() => {
    validateNoForbiddenFields({ userId: "u1", rank: 8, version: 1 });
  });
});

