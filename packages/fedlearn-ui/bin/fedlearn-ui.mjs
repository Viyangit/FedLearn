#!/usr/bin/env node

import { readSummary, renderDashboard } from "../src/dashboard.mjs";

function parseArgs(argv) {
  const out = {
    once: false,
    intervalMs: 1500,
    userId: process.env.FEDLEARN_USER_ID ?? "fedlearn-ui-dashboard"
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--once") {
      out.once = true;
    } else if (token === "--interval-ms") {
      const raw = argv[i + 1];
      if (raw) {
        out.intervalMs = Math.max(250, Number(raw));
        i += 1;
      }
    } else if (token === "--user-id") {
      const raw = argv[i + 1];
      if (raw) {
        out.userId = raw;
        i += 1;
      }
    }
  }
  return out;
}

export async function renderOnce(userId) {
  const summary = await readSummary(userId);
  const panel = renderDashboard(summary);
  console.log(panel);
}

const options = parseArgs(process.argv.slice(2));
if (options.once) {
  await renderOnce(options.userId);
  process.exit(0);
}

let stopping = false;
let timer = null;
const stop = () => {
  if (stopping) {
    return;
  }
  stopping = true;
  if (timer !== null) {
    clearInterval(timer);
  }
  console.log("\nfedlearn-ui terminated.");
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await renderOnce(options.userId);
timer = setInterval(async () => {
  if (stopping) {
    return;
  }
  process.stdout.write("\x1Bc");
  await renderOnce(options.userId);
}, options.intervalMs);

