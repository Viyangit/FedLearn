#!/usr/bin/env node
/**
 * Print pattern-coverage (adaptivePct) vs session count for experiment planning.
 * Usage: node scripts/friend-validation/session-targets.mjs [--midpoint 15] [--steepness 40]
 */
import { adaptivePct } from "../../packages/fedlearn-js/dist/personalisation.js";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  const n = Number(process.argv[idx + 1]);
  return Number.isFinite(n) ? n : fallback;
}

const midpoint = parseArg("--midpoint", 15);
const steepness = parseArg("--steepness", 40);
const cfg = { midpoint, steepness };

console.log(`Pattern coverage curve (midpoint=${midpoint}, steepness=${steepness})\n`);
console.log("sessions | pattern_coverage %");
console.log("---------|-------------------");

const targets = [0, 60, 100];
const hits = { 0: null, 60: null, 100: null };

for (let s = 0; s <= 40; s++) {
  const pct = adaptivePct(s, cfg);
  for (const t of targets) {
    if (hits[t] === null && pct >= t - 0.5) {
      hits[t] = s;
    }
  }
  if (s <= 20 || s % 5 === 0 || s >= 25) {
    console.log(`${String(s).padStart(8)} | ${pct.toFixed(2)}`);
  }
}

console.log("\nSuggested profile targets (first session count reaching ~threshold):");
for (const t of targets) {
  console.log(`  ~${t}%  ->  ${hits[t] ?? "n/a"} sessions (approximate)`);
}

console.log("\nDefault curve (midpoint=15): ~60% at 16 sessions, ~99% by 29 sessions.");
console.log("Experiment curve (midpoint=5):  ~60% at 6 sessions,  ~99% by 19 sessions.");
