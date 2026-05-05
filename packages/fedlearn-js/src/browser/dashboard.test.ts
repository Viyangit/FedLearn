import test from "node:test";
import assert from "node:assert/strict";

import { buildPrivacyDashboardText, formatEpsilon } from "./dashboard";

test("formatEpsilon renders fixed precision output", () => {
  const out = formatEpsilon({ consumed: 1.234, total: 8 });
  assert.equal(out, "1.23ε / 8.00ε");
});

test("buildPrivacyDashboardText returns expected lines", () => {
  const lines = buildPrivacyDashboardText({
    personalizationPercent: 82.2,
    consumedEpsilon: 1.6,
    totalEpsilon: 8.0,
    contributionEnabled: true,
    federationMode: "gradient",
    tier: "dp",
    sessionsRetained: 47,
    rankLabel: "r=8 (auto-adjusted)"
  });
  assert.equal(lines.length, 6);
  assert.ok(lines[0].includes("82.2%"));
  assert.ok(lines[2].includes("ON"));
  assert.ok(lines[3].includes("47"));
  assert.ok(lines[4].includes("r=8"));
});

