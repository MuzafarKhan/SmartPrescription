export interface PreloadMapping {
  method: string;
  channel: string;
}

export function parsePreload(content: string): PreloadMapping[] {
  const results: PreloadMapping[] = [];
  const methodRegex = /(\w+)\s*:\s*(?:\([^)]*\)\s*)=>\s*ipcRenderer\.(?:invoke|send)\(\s*["']([^"']+)["']/g;

  let match: RegExpExecArray | null;
  while ((match = methodRegex.exec(content)) !== null) {
    results.push({ method: match[1], channel: match[2] });
  }

  return results;
}

export interface HandlerChannel {
  channel: string;
  line: number;
  snippet: string;
  tables: string[];
  operation: "read" | "write" | "delete" | "print" | "other";
}

export function parseHandler(content: string): HandlerChannel[] {
  const results: HandlerChannel[] = [];
  const handleRegex = /ipcMain\.(?:handle|on)\(\s*["']([^"']+)["']/g;

  let match: RegExpExecArray | null;
  while ((match = handleRegex.exec(content)) !== null) {
    const channel = match[1];
    const blockStart = match.index;
    const blockEnd = findBlockEnd(content, blockStart);
    const block = content.slice(blockStart, blockEnd);
    const tables = extractSqlTables(block);
    const operation = inferOperation(block, channel);

    results.push({
      channel,
      line: content.slice(0, blockStart).split("\n").length,
      snippet: block.slice(0, 120).replace(/\s+/g, " ").trim(),
      tables,
      operation,
    });
  }

  return results;
}

function findBlockEnd(content: string, start: number): number {
  let depth = 0;
  let started = false;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{") {
      depth++;
      started = true;
    } else if (ch === "}") {
      depth--;
      if (started && depth === 0) return i + 1;
    }
  }
  return Math.min(start + 2000, content.length);
}

export function extractSqlTables(sql: string): string[] {
  const tables = new Set<string>();
  const patterns = [
    /\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /\bINTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      const name = m[1].toLowerCase();
      if (!["select", "where", "set", "values"].includes(name)) {
        tables.add(name);
      }
    }
  }

  return [...tables];
}

function inferOperation(
  block: string,
  channel: string
): "read" | "write" | "delete" | "print" | "other" {
  const lower = block.toLowerCase();
  const ch = channel.toLowerCase();

  if (ch.includes("print")) return "print";
  if (/\bdelete\s+from\b/.test(lower) || ch.startsWith("delete-")) return "delete";
  if (/\binsert\s+into\b/.test(lower) || /\bupdate\s+/.test(lower) || ch.startsWith("add-") || ch.startsWith("update-") || ch.startsWith("attach-") || ch.startsWith("save-") || ch.startsWith("create-")) {
    return "write";
  }
  if (/\bselect\b/.test(lower) || ch.startsWith("get-")) return "read";
  return "other";
}

export function parseElectronApiUsage(content: string, filePath: string): Map<string, string[]> {
  const usage = new Map<string, string[]>();
  const re = /electronAPI\.(\w+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(content)) !== null) {
    const method = m[1];
    const line = content.slice(0, m.index).split("\n").length;
    const key = method;
    const existing = usage.get(key) ?? [];
    existing.push(`${filePath}:${line}`);
    usage.set(key, existing);
  }

  return usage;
}

export function parseLocalStorageUsage(content: string, filePath: string): Map<string, string[]> {
  const usage = new Map<string, string[]>();
  const patterns = [
    /localStorage\.(?:getItem|setItem|removeItem)\(\s*["']([^"']+)["']/g,
    /localStorage\.(\w+)/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const key = m[1];
      if (["getItem", "setItem", "removeItem", "clear", "key", "length"].includes(key)) continue;
      const line = content.slice(0, m.index).split("\n").length;
      const existing = usage.get(key) ?? [];
      existing.push(`${filePath}:${line}`);
      usage.set(key, existing);
    }
  }

  return usage;
}

export function parseRoutes(content: string): { page: string; viewHtml: string }[] {
  const routes: { page: string; viewHtml: string }[] = [];
  const caseRegex = /case\s+["']([^"']+)["']\s*:\s*\n\s*\$\("#content"\)\.load\(\s*["']\.\/views\/([^"']+)["']\s*\)/g;

  let m: RegExpExecArray | null;
  while ((m = caseRegex.exec(content)) !== null) {
    routes.push({ page: m[1], viewHtml: `DesktopApp/sm/views/${m[2]}` });
  }

  return routes;
}

export function parseFunctions(content: string, filePath: string): { name: string; line: number }[] {
  const fns: { name: string; line: number }[] = [];
  const patterns = [
    /function\s+(\w+)\s*\(/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?function/g,
    /(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const name = m[1];
      if (["if", "for", "while", "switch", "catch"].includes(name)) continue;
      const line = content.slice(0, m.index).split("\n").length;
      fns.push({ name, line });
    }
  }

  return fns;
}

export const LOCAL_STORAGE_PURPOSES: Record<string, string> = {
  allPatients: "Pending/active patient prescriptions (keyed by prescriptionUniqueId)",
  settings: "Cached copy of DB settings for synchronous UI access",
  translation: "Cached Urdu translations from DB",
  getPrescriptionData: "Temporary prescription form state",
  laminectomy: "Surgery template data (laminectomy)",
  tpf: "Surgery template data (TPF)",
  craniotomy: "Surgery template data (craniotomy)",
  vpshunt: "Surgery template data (VP shunt)",
  mmc: "Surgery template data (MMC)",
};
