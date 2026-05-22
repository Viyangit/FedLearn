import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Append `.fedlearn/` to workspace .gitignore if missing (never rewrite whole file).
 */
export function ensureGitignore(workspaceRoot: string): void {
  const gitignorePath = path.join(workspaceRoot, ".gitignore");
  const fedlearnEntry = ".fedlearn/";

  if (!fs.existsSync(gitignorePath)) {
    return;
  }

  const contents = fs.readFileSync(gitignorePath, "utf8");
  if (contents.includes(fedlearnEntry)) {
    return;
  }

  fs.appendFileSync(
    gitignorePath,
    `\n# FedLearn watcher state (local only)\n${fedlearnEntry}\n`
  );
  console.log("[FedLearn] Added .fedlearn/ to .gitignore");
}
