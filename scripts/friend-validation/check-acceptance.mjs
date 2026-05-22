#!/usr/bin/env node
/**
 * Watcher-only acceptance checks for friend validation (no secrets in output).
 *
 * Usage:
 *   node scripts/friend-validation/check-acceptance.mjs --workspace-root /path/to/project
 *   FEDLEARN_USER_ID=friend-mid FEDLEARN_LOCAL_STORE=~/.fedlearn-validation/friend-mid.json node scripts/friend-validation/check-acceptance.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

const workspaceRoot = path.resolve(arg("--workspace-root", process.cwd()));
const mdcPath = path.join(workspaceRoot, ".cursor", "rules", "fedlearn.generated.mdc");
const fedlearnDir = path.join(workspaceRoot, ".fedlearn");
const storeEnv = process.env.FEDLEARN_LOCAL_STORE?.trim();
const userId = process.env.FEDLEARN_USER_ID?.trim() ?? "(unset)";

const report = {
  ok: true,
  checks: [],
  metrics: {}
};

function pass(id, detail) {
  report.checks.push({ id, status: "pass", detail });
}

function fail(id, detail) {
  report.ok = false;
  report.checks.push({ id, status: "fail", detail });
}

function warn(id, detail) {
  report.checks.push({ id, status: "warn", detail });
}

// --- .mdc ---
if (fs.existsSync(mdcPath)) {
  const stat = fs.statSync(mdcPath);
  const body = fs.readFileSync(mdcPath, "utf8");
  pass("mdc_exists", mdcPath);
  report.metrics.mdc_mtime_iso = stat.mtime.toISOString();
  report.metrics.mdc_bytes = stat.size;

  const hintMatch = body.match(/## Conversation pattern hints\n\n([\s\S]*?)\n\n## FedLearn local metrics/);
  const hints = hintMatch ? hintMatch[1].trim() : "";
  report.metrics.hint_bullet_count = (hints.match(/^- /gm) ?? []).length;
  report.metrics.hint_preview = hints.slice(0, 200).replace(/\n/g, " ");

  if (hints.includes("Not enough recent user messages")) {
    warn("mdc_hints", "Hints block still empty — train with Composer messages while watch runs");
  } else {
    pass("mdc_hints", `${report.metrics.hint_bullet_count} hint bullet(s)`);
  }

  const pctMatch = body.match(/Pattern coverage \(sigmoid gauge\): ([\d.]+)%/);
  if (pctMatch) report.metrics.pattern_coverage_pct = Number(pctMatch[1]);

  const epsMatch = body.match(/Privacy budget: ([\d.]+)ε \/ ([\d.]+)ε consumed/);
  if (epsMatch) {
    report.metrics.consumed_epsilon = Number(epsMatch[1]);
    report.metrics.total_epsilon = Number(epsMatch[2]);
  }
} else {
  fail("mdc_exists", `Missing ${mdcPath} — run watch in this workspace`);
}

// --- watcher state (metrics only, no message bodies) ---
const statePath = path.join(fedlearnDir, "watcher-state.json");
if (fs.existsSync(statePath)) {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    report.metrics.watcher_recent_user_message_count = Array.isArray(state.recentUserMessages)
      ? state.recentUserMessages.length
      : 0;
    report.metrics.watcher_processed_pairs = Array.isArray(state.processedPairHashes)
      ? state.processedPairHashes.length
      : 0;
    pass("watcher_state", `${report.metrics.watcher_recent_user_message_count} recent user msgs (count only)`);
  } catch {
    warn("watcher_state", "Could not parse watcher-state.json");
  }
} else {
  warn("watcher_state", "No .fedlearn/watcher-state.json yet");
}

// --- adapter store ---
let storePath = storeEnv;
if (!storePath) {
  storePath = path.join(workspaceRoot, ".fedlearn-local-adapters.json");
}
if (fs.existsSync(storePath)) {
  try {
    const all = JSON.parse(fs.readFileSync(storePath, "utf8"));
    const uid = process.env.FEDLEARN_USER_ID?.trim();
    const rec = uid ? all[uid] : null;
    if (rec) {
      report.metrics.sessions = rec.sessionCount ?? 0;
      report.metrics.consumed_epsilon_store = rec.budgetState?.consumedEpsilon;
      report.metrics.total_epsilon_store = rec.budgetState?.totalEpsilon;
      pass("adapter_store", `user ${uid}: sessions=${report.metrics.sessions}`);
    } else {
      warn("adapter_store", `Store exists but no record for FEDLEARN_USER_ID=${uid ?? "(unset)"}`);
    }
  } catch {
    fail("adapter_store", "Invalid JSON in adapter store");
  }
} else {
  warn("adapter_store", `No store at ${storePath}`);
}

// --- verify-local (optional) ---
try {
  const { verifyLocalDataFlow } = await import(
    path.join(repoRoot, "packages/fedlearn-js/dist/local_adapter.js")
  );
  const v = await verifyLocalDataFlow(`acceptance-probe-${Date.now()}`);
  if (v.ok) pass("verify_local", "memory persistence, no network egress");
  else fail("verify_local", v.details.join("; "));
} catch (e) {
  warn("verify_local", `Skipped: ${e instanceof Error ? e.message : String(e)}`);
}

report.metrics.fedlearn_user_id = userId;
report.metrics.workspace_root = workspaceRoot;

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
