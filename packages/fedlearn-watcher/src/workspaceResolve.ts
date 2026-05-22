import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

function normalizeProjectPath(abs: string): string {
  return path.resolve(abs);
}

function folderUriToPath(folderUri: string): string | null {
  try {
    if (folderUri.startsWith("file://")) {
      return normalizeProjectPath(fileURLToPath(folderUri));
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Find `workspaceStorage/<id>/state.vscdb` whose `workspace.json` folder matches this project path.
 */
export function findWorkspaceStateDbForFolder(projectRootAbs: string): string | null {
  const root = normalizeProjectPath(projectRootAbs);
  const base =
    process.platform === "darwin"
      ? path.join(os.homedir(), "Library", "Application Support", "Cursor", "User", "workspaceStorage")
      : process.platform === "win32"
        ? path.join(process.env.APPDATA ?? "", "Cursor", "User", "workspaceStorage")
        : path.join(os.homedir(), ".config", "Cursor", "User", "workspaceStorage");

  if (!fs.existsSync(base)) {
    return null;
  }

  for (const id of fs.readdirSync(base, { withFileTypes: true })) {
    if (!id.isDirectory()) {
      continue;
    }
    const wj = path.join(base, id.name, "workspace.json");
    const dbp = path.join(base, id.name, "state.vscdb");
    if (!fs.existsSync(wj) || !fs.existsSync(dbp)) {
      continue;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(wj, "utf8")) as { folder?: string };
      const folder = parsed.folder;
      if (typeof folder !== "string") {
        continue;
      }
      const folderPath = folderUriToPath(folder);
      if (folderPath && folderPath === root) {
        return dbp;
      }
    } catch {
      // ignore
    }
  }

  return null;
}
