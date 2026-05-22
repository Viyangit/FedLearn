import * as fs from "node:fs";
import * as path from "node:path";
import type { LocalAdapter } from "fedlearn-core";
import { adaptivePct, sessionLabel } from "fedlearn-core";
import { extractStyleHints } from "./styleHints.js";

export function writeFedlearnGeneratedMdcSync(
  workspaceRoot: string,
  adapter: LocalAdapter,
  recentUserMessages: string[]
): void {
  const rulesDir = path.join(workspaceRoot, ".cursor", "rules");
  fs.mkdirSync(rulesDir, { recursive: true });

  const outPath = path.join(rulesDir, "fedlearn.generated.mdc");

  const summary = adapter.memorySummary();
  const sessions = summary.sessionsRetained;
  const pct = adaptivePct(sessions);
  const label = sessionLabel(sessions);

  const hints = extractStyleHints(recentUserMessages);
  const hintsBlock =
    hints.length > 0
      ? hints.map((h) => `- ${h}`).join("\n")
      : "- (Not enough recent user messages to infer patterns yet.)";

  const body = `# FedLearn — Auto-generated context

> **Source:** Patterns **observed from recent Cursor chat messages**, not adapter weights (weights-driven prose requires the Rust/WASM bridge).

## Conversation pattern hints

${hintsBlock}

## FedLearn local metrics (sessions / budget bookkeeping)

- User id: \`${summary.userId}\`
- ${label}
- Pattern coverage (sigmoid gauge): ${pct.toFixed(2)}%
- Privacy budget: ${summary.consumedEpsilon.toFixed(4)}ε / ${summary.totalEpsilon.toFixed(2)}ε consumed
- Rank: ${summary.autoAdjustedRankLabel}
`;

  const header = `---
description: FedLearn personalization (conversation-pattern observation; auto-generated — do not hand-edit expecting persistence)
alwaysApply: true
---

`;

  fs.writeFileSync(outPath, header + body, "utf8");
}
