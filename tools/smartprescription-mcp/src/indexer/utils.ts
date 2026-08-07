import fs from "node:fs";
import path from "node:path";
import type { FileRole } from "../types.js";

const APP_REL = "DesktopApp/sm";

const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".vs",
  "libraries",
  "otherlibraries",
  "fonts",
]);

export function resolveProjectRoot(): string {
  const envRoot = process.env.SMARTPRESCRIPTION_ROOT;
  if (envRoot && fs.existsSync(envRoot)) return path.resolve(envRoot);

  const candidates = [import.meta.dirname, process.cwd()];
  for (const start of candidates) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, "SmartPrescription.sln"))) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  throw new Error(
    "Could not find SmartPrescription project root. Set SMARTPRESCRIPTION_ROOT env var."
  );
}

export function getAppRoot(projectRoot: string): string {
  return path.join(projectRoot, APP_REL.replace("/", path.sep));
}

export function classifyFile(relativePath: string): FileRole {
  const p = relativePath.replace(/\\/g, "/");

  if (p === "DesktopApp/sm/main.js") return "entry";
  if (p === "DesktopApp/sm/preload.js") return "preload";
  if (p === "DesktopApp/sm/common.js") return "common";
  if (p === "DesktopApp/sm/scripts/index.js") return "routing";
  if (p === "DesktopApp/sm/preData.db") return "database";
  if (p.endsWith("Web.config") || p.endsWith("package.json")) return "config";
  if (p.includes("/handlers/") && p.endsWith(".js")) return "handler";
  if (p.includes("/views/popup/") && p.endsWith(".html")) return "popup-html";
  if (p.includes("/scripts/views/popup/") && p.endsWith(".js")) return "popup-js";
  if (p.includes("/views/") && p.endsWith(".html")) return "view-html";
  if (p.includes("/scripts/views/") && p.endsWith(".js")) return "view-js";
  if (p.includes("/sections/") && p.endsWith(".html")) return "section-html";
  if (p.includes("/scripts/sections/") && p.endsWith(".js")) return "section-js";
  if (p.includes("/libraries/") || p.includes("/otherlibraries/")) return "vendor";

  return "other";
}

export function inferDomain(relativePath: string): string | undefined {
  const p = relativePath.replace(/\\/g, "/").toLowerCase();
  const domains = [
    "chief-complaint",
    "diagnosis",
    "investigation",
    "plan",
    "medicine",
    "patient-instruction",
    "rehabilitation-aids",
    "settings",
    "pending-patients",
    "home",
    "print",
  ];

  for (const d of domains) {
    if (p.includes(d.replace("-", "-")) || p.includes(d.replace("-", "_"))) {
      return d;
    }
  }

  if (p.includes("patient-information")) return "patient-information";
  if (p.includes("setting")) return "settings";
  return undefined;
}

export function shouldIndex(relativePath: string): boolean {
  const p = relativePath.replace(/\\/g, "/");
  const parts = p.split("/");

  for (const part of parts) {
    if (IGNORE_DIRS.has(part)) return false;
  }

  if (p.endsWith(".js") || p.endsWith(".html") || p.endsWith(".db")) return true;
  if (p.endsWith("main.js") || p.endsWith("preload.js") || p.endsWith("common.js")) return true;
  return false;
}

export function readTextSafe(filePath: string, maxBytes = 512_000): string {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > maxBytes) {
      const fd = fs.openSync(filePath, "r");
      const buf = Buffer.alloc(maxBytes);
      fs.readSync(fd, buf, 0, maxBytes, 0);
      fs.closeSync(fd);
      return buf.toString("utf8");
    }
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

export function snippetAround(content: string, index: number, radius = 80): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + radius);
  return content.slice(start, end).replace(/\s+/g, " ").trim();
}
