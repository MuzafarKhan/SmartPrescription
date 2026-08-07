import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DbConfig {
  dbPath: string;
  readOnly: boolean;
  maxRows: number;
}

function findProjectRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, "DesktopApp", "sm", "preData.db");
    if (fs.existsSync(candidate)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function loadConfig(): DbConfig {
  const root =
    process.env.SMARTPRESCRIPTION_ROOT ??
    findProjectRoot(path.resolve(__dirname, "..", "..", "..")) ??
    process.cwd();

  const dbPathEnv = process.env.DB_PATH ?? "DesktopApp/sm/preData.db";
  const dbPath = path.isAbsolute(dbPathEnv) ? dbPathEnv : path.join(root, dbPathEnv);

  const readOnly = (process.env.DB_READ_ONLY ?? "false").toLowerCase() === "true";
  const maxRows = Number.parseInt(process.env.DB_MAX_ROWS ?? "500", 10);

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }

  return {
    dbPath,
    readOnly,
    maxRows: Number.isFinite(maxRows) && maxRows > 0 ? maxRows : 500,
  };
}
