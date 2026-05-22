#!/usr/bin/env node

import readline from "node:readline";

const { createGuaranteedLocalRunner } = await import("../dist/runTurnLocal.js");

function parseArgs(argv) {
  const out = {
    userId: process.env.FEDLEARN_USER_ID ?? "fedlearn-guaranteed-user",
    onceMessage: /** @type {string | null} */ null
  };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "--user-id") {
      const v = argv[i + 1];
      if (v) {
        out.userId = v;
        i += 1;
      }
    } else if (t === "--once") {
      const rest = argv.slice(i + 1).join(" ").trim();
      out.onceMessage = rest || null;
      break;
    }
  }
  return out;
}

const options = parseArgs(process.argv.slice(2));
const runner = await createGuaranteedLocalRunner(options.userId);
await runner.syncFromDisk();

async function oneTurn(trimmed) {
  const out = await runner.runTurn({
    userInput: trimmed,
    conversationIdPrefix: "guaranteed-cli"
  });
  console.log(`\nAssistant:\n${out.reply}\n`);
  console.log(
    `[FedLearn state] sessions=${out.sessions} pattern_coverage=${out.personalizationPct.toFixed(2)}% ε_used=${out.consumedEpsilon.toFixed(4)}\n`
  );
}

if (options.onceMessage !== null) {
  if (!options.onceMessage) {
    console.error("fedlearn-guaranteed-chat: --once requires a message after the flag.");
    process.exit(1);
  }
  await oneTurn(options.onceMessage.trim());
  process.exit(0);
}

console.error("");
console.error(
  `[fedlearn-guaranteed-chat] userId=${options.userId}\nUse the same cwd (or FEDLEARN_LOCAL_STORE) as fedlearn-ui.\nEvery line runs learn + apply. Ctrl+C to exit.\n`
);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const prompt = () => {
  rl.question("You: ", async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      prompt();
      return;
    }
    try {
      await oneTurn(trimmed);
    } catch (e) {
      console.error("[error]", e.message ?? String(e));
    }
    prompt();
  });
};

prompt();
