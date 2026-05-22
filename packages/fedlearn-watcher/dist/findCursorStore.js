import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
export function findCursorStateDbPath() {
    const bases = [];
    if (process.platform === "darwin") {
        bases.push(path.join(os.homedir(), "Library", "Application Support", "Cursor"));
    }
    else if (process.platform === "win32") {
        const app = process.env.APPDATA;
        if (app) {
            bases.push(path.join(app, "Cursor"));
        }
    }
    else {
        bases.push(path.join(os.homedir(), ".config", "Cursor"));
    }
    for (const base of bases) {
        const db = path.join(base, "User", "globalStorage", "state.vscdb");
        if (fs.existsSync(db)) {
            return db;
        }
    }
    return null;
}
