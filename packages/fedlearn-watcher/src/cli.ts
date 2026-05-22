import path from "node:path";
import { ensureGitignore } from "./gitignore.js";
import { findCursorStateDbPath } from "./findCursorStore.js";
import { CursorReader } from "./cursorReader.js";
import { FedLearnWatcherRun } from "./watcher.js";
import { findWorkspaceStateDbForFolder } from "./workspaceResolve.js";

function parseArgs(argv: string[]): {
  cmd: "inspect" | "run";
  workspaceRoot: string;
  userId: string;
  pollMs: number;
  dumpSample: boolean;
} {
  let cmd: "inspect" | "run" = "run";
  let workspaceRoot = process.cwd();
  let userId = process.env.FEDLEARN_USER_ID ?? "fedlearn-watcher-user";
  let pollMs = 1500;
  let dumpSample = false;

  let i = 0;
  if (argv[0] === "inspect" || argv[0] === "run") {
    cmd = argv[0];
    i = 1;
  }

  for (; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "--workspace-root" && argv[i + 1]) {
      workspaceRoot = path.resolve(argv[i + 1]);
      i += 1;
    } else if (t === "--user-id" && argv[i + 1]) {
      userId = argv[i + 1];
      i += 1;
    } else if (t === "--poll-ms" && argv[i + 1]) {
      pollMs = Math.max(500, Number.parseInt(argv[i + 1], 10) || 1500);
      i += 1;
    } else if (t === "--dump-sample") {
      dumpSample = true;
    }
  }

  return { cmd, workspaceRoot, userId, pollMs, dumpSample };
}

export function runInspect(workspaceRoot: string, dumpSample = false): void {
  const globalPath = findCursorStateDbPath();
  const workspacePath = findWorkspaceStateDbForFolder(workspaceRoot);

  console.log(`workspaceRoot: ${workspaceRoot}`);
  console.log(`global state.vscdb: ${globalPath ?? "(not found)"}`);
  console.log(
    `workspace state.vscdb: ${workspacePath ?? "(no workspaceStorage entry for this folder — open it in Cursor once)"}`
  );

  if (!globalPath && !workspacePath) {
    console.error("Neither global nor workspace Cursor DB resolved.");
    process.exitCode = 1;
    return;
  }

  const reader = new CursorReader({
    globalPath,
    workspacePath
  });

  console.log("");
  console.log(reader.inspectOverview());
  console.log("");

  const turns = reader.extractAllTurns();
  const users = turns.filter((t) => t.role === "user").length;
  const assistants = turns.filter((t) => t.role === "assistant").length;
  console.log(`Extracted turns (merged): ${turns.length} (user=${users}, assistant=${assistants})`);
  console.log(
    "(Composer path uses aiService.generations; assistant lines may be FedLearn placeholders unless Cursor persists real replies.)"
  );

  if (dumpSample && turns.length > 0) {
    console.log("\nSample (first 4 turns):");
    for (const t of turns.slice(0, 4)) {
      const snip =
        t.content.length > 120 ? `${t.content.slice(0, 117)}…` : t.content;
      console.log(`  [${t.role}] ${t.sessionHint} @${t.timestamp}: ${snip}`);
    }
  }

  reader.close();
}

export function runWatchCli(args: {
  workspaceRoot: string;
  userId: string;
  pollMs: number;
}): void {
  ensureGitignore(args.workspaceRoot);

  const w = new FedLearnWatcherRun({
    userId: args.userId,
    workspaceRoot: args.workspaceRoot,
    pollMs: args.pollMs,
    onLearned: ({ pairs }) => {
      if (pairs > 0) {
        process.stdout.write(`\r[FedLearn watcher] learned ${pairs} pair(s) this poll`.padEnd(72, " "));
      }
    }
  });

  console.log(
    `[fedlearn-watcher] userId=${args.userId} workspace=${args.workspaceRoot} poll=${args.pollMs}ms\n` +
      "Chat in Cursor normally. Stop with Ctrl+C.\n"
  );

  w.start();

  const stop = () => {
    w.stop();
    console.log("\n[fedlearn-watcher] stopped.");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

export function main(argv: string[]): void {
  const { cmd, workspaceRoot, userId, pollMs, dumpSample } = parseArgs(argv);

  if (cmd === "inspect") {
    runInspect(workspaceRoot, dumpSample);
    return;
  }

  runWatchCli({ workspaceRoot, userId, pollMs });
}
