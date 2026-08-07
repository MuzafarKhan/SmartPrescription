import fs from "node:fs";
import path from "node:path";
import type {
  CodeIndex,
  FeatureAnalysisResult,
  FeatureDomain,
  ImpactResult,
  SearchResult,
} from "./types.js";
import { formatFeatureTree } from "./indexer/index-builder.js";
import { readTextSafe, snippetAround, toPosix } from "./indexer/utils.js";
import { parseFunctions } from "./indexer/parsers.js";

export class QueryEngine {
  constructor(private index: CodeIndex) {}

  getOverview(): string {
    const a = this.index.architecture;
    const featureList = this.index.features.map((f) => `- ${f.name} (${f.id})`).join("\n");

    return `# SmartPrescription Architecture Overview

**Type:** ${a.type}

**Stack:** ${a.stack.join(", ")}

## Layers
- **Frontend:** ${a.frontend}
- **Backend:** ${a.backend}
- **Database:** ${a.database}
- **Patient/session data:** ${a.patientData}
- **Communication:** ${a.communication}

## Application Root
\`${this.index.appRoot}\`

## Feature Domains (${this.index.features.length})
${featureList}

## IPC Channels: ${this.index.ipcChannels.length}
## SQLite Tables: ${this.index.dbTables.map((t) => t.name).join(", ")}
## localStorage Keys: ${this.index.localStorageKeys.map((k) => k.key).join(", ")}

## Key Entry Points
- \`DesktopApp/sm/main.js\` — Electron main process
- \`DesktopApp/sm/preload.js\` — IPC bridge (electronAPI)
- \`DesktopApp/sm/index.html\` — UI shell
- \`DesktopApp/sm/scripts/index.js\` — Client routing
- \`DesktopApp/sm/common.js\` — Shared utilities (renderer + main)
- \`DesktopApp/sm/handlers/main-handler.js\` — Loads all IPC handlers

Use \`get_feature_map\`, \`analyze_feature\`, or \`trace_data_flow\` for targeted exploration.`;
  }

  getStructure(layer?: string): string {
    const roles: Record<string, string[]> = {};

    for (const f of this.index.files) {
      if (layer) {
        const l = layer.toLowerCase();
        if (l === "frontend" && !["view-html", "view-js", "section-html", "section-js", "popup-html", "popup-js", "routing"].includes(f.role)) continue;
        if (l === "backend" && !["entry", "handler", "preload"].includes(f.role)) continue;
        if (l === "database" && f.role !== "database" && !f.relativePath.includes("handler")) continue;
        if (l === "shared" && f.role !== "common") continue;
      }
      const bucket = roles[f.role] ?? [];
      bucket.push(f.relativePath);
      roles[f.role] = bucket;
    }

    const lines = ["# Project Structure (indexed application files only)\n"];
    for (const [role, files] of Object.entries(roles).sort()) {
      lines.push(`## ${role} (${files.length})`);
      for (const f of files.slice(0, 30)) lines.push(`- ${f}`);
      if (files.length > 30) lines.push(`- ... and ${files.length - 30} more`);
      lines.push("");
    }
    return lines.join("\n");
  }

  searchSymbols(query: string, limit = 20): SearchResult[] {
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const f of this.index.files.filter((x) => x.relativePath.endsWith(".js"))) {
      const content = readTextSafe(f.path, 200_000);
      for (const fn of parseFunctions(content, f.relativePath)) {
        if (fn.name.toLowerCase().includes(q)) {
          results.push({
            kind: "function",
            name: fn.name,
            file: f.relativePath,
            line: fn.line,
            relevance: fn.name.toLowerCase() === q ? 1 : 0.7,
          });
        }
      }

      const idx = content.toLowerCase().indexOf(q);
      if (idx >= 0 && !results.some((r) => r.file === f.relativePath)) {
        results.push({
          kind: "text-match",
          name: query,
          file: f.relativePath,
          snippet: snippetAround(content, idx),
          relevance: 0.4,
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  searchIpc(query: string): string {
    const q = query.toLowerCase();
    const matches = this.index.ipcChannels.filter(
      (c) =>
        c.channel.toLowerCase().includes(q) ||
        c.preloadMethod?.toLowerCase().includes(q) ||
        c.handlerFile.toLowerCase().includes(q)
    );

    if (!matches.length) return `No IPC channels matching "${query}".`;

    return matches
      .map(
        (c) =>
          `**${c.channel}** (${c.operation})
  - Handler: ${c.handlerFile}
  - Preload: electronAPI.${c.preloadMethod ?? "(not exposed)"}()
  - Tables: ${c.tables.join(", ") || "none"}
  - Used by: ${c.usedBy.slice(0, 5).join(", ") || "none"}${c.usedBy.length > 5 ? ` (+${c.usedBy.length - 5})` : ""}`
      )
      .join("\n\n");
  }

  searchDatabase(query: string): string {
    const q = query.toLowerCase();
    const tables = this.index.dbTables.filter((t) => t.name.includes(q));

    if (!tables.length) {
      const fromChannels = this.index.ipcChannels.filter((c) =>
        c.tables.some((t) => t.includes(q))
      );
      if (fromChannels.length) {
        return fromChannels
          .map((c) => `Table refs in ${c.channel}: ${c.tables.join(", ")}`)
          .join("\n");
      }
      return `No database tables matching "${query}". Known tables: ${this.index.dbTables.map((t) => t.name).join(", ")}`;
    }

    return tables
      .map(
        (t) =>
          `**${t.name}**
  - Handlers: ${t.usedByHandlers.join(", ")}
  - IPC channels: ${t.usedByChannels.join(", ")}`
      )
      .join("\n\n");
  }

  findReferences(target: string): string {
    const q = target.toLowerCase();
    const lines: string[] = [`# References to "${target}"\n`];

    // IPC method
    const ipc = this.index.ipcChannels.filter(
      (c) => c.channel.toLowerCase().includes(q) || c.preloadMethod?.toLowerCase() === q
    );
    if (ipc.length) {
      lines.push("## IPC");
      for (const c of ipc) {
        lines.push(`- ${c.channel} ← ${c.handlerFile}`);
        lines.push(`  Used by: ${c.usedBy.join(", ") || "none"}`);
      }
    }

    // File path
    const fileHits = this.index.files.filter((f) => f.relativePath.toLowerCase().includes(q));
    if (fileHits.length) {
      lines.push("\n## Files");
      for (const f of fileHits) lines.push(`- ${f.relativePath} (${f.role}${f.domain ? `, ${f.domain}` : ""})`);
    }

    // Table
    const tables = this.index.dbTables.filter((t) => t.name.includes(q));
    if (tables.length) {
      lines.push("\n## Database Tables");
      for (const t of tables) {
        lines.push(`- ${t.name} — handlers: ${t.usedByHandlers.join(", ")}`);
      }
    }

    // localStorage
    const ls = this.index.localStorageKeys.filter((k) => k.key.toLowerCase().includes(q));
    if (ls.length) {
      lines.push("\n## localStorage");
      for (const k of ls) {
        lines.push(`- ${k.key}${k.purpose ? `: ${k.purpose}` : ""}`);
        lines.push(`  Used by: ${k.usedBy.join(", ")}`);
      }
    }

    // Text search in source (limited)
    lines.push("\n## Source mentions (sample)");
    let count = 0;
    for (const f of this.index.files.filter((x) => x.relativePath.endsWith(".js"))) {
      const content = readTextSafe(f.path, 150_000);
      if (content.toLowerCase().includes(q)) {
        const idx = content.toLowerCase().indexOf(q);
        lines.push(`- ${f.relativePath}: ...${snippetAround(content, idx, 50)}...`);
        if (++count >= 15) break;
      }
    }

    return lines.join("\n");
  }

  analyzeFeature(query: string): FeatureAnalysisResult {
    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);

    const scored = this.index.features.map((f) => {
      let score = 0;
      if (f.id.includes(q) || f.name.toLowerCase().includes(q)) score += 10;
      for (const kw of f.keywords) {
        if (q.includes(kw.toLowerCase())) score += 5;
        for (const w of words) {
          if (kw.toLowerCase().includes(w)) score += 2;
        }
      }
      if (f.data.tables.some((t) => q.includes(t))) score += 3;
      if (f.data.localStorageKeys.some((k) => q.includes(k.toLowerCase()))) score += 3;
      return { feature: f, score };
    });

    const matched = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.feature);

    const primary = matched[0];
    const likelyFiles = primary ? this.collectFeatureFiles(primary) : [];
    const related = primary ? this.collectRelatedFiles(primary) : [];

    const trees = matched.map(formatFeatureTree).join("\n\n---\n\n");

    return {
      query,
      matchedFeatures: matched,
      implementationPath: trees || "No strong feature match. Try searching IPC, database, or symbols.",
      likelyFilesToModify: likelyFiles,
      relatedFiles: related.filter((f) => !likelyFiles.includes(f)),
      dataFlow: primary ? this.describeDataFlow(primary) : "",
    };
  }

  traceDataFlow(featureId: string): string {
    const feature = this.index.features.find(
      (f) => f.id === featureId || f.name.toLowerCase() === featureId.toLowerCase()
    );
    if (!feature) {
      const guess = this.analyzeFeature(featureId);
      if (guess.matchedFeatures[0]) {
        return this.describeDataFlow(guess.matchedFeatures[0]);
      }
      return `Feature "${featureId}" not found. Available: ${this.index.features.map((f) => f.id).join(", ")}`;
    }
    return this.describeDataFlow(feature);
  }

  getChangeImpact(target: string): ImpactResult {
    const q = target.toLowerCase();
    const direct = new Set<string>();
    const indirect = new Set<string>();
    const features = new Set<string>();

    // Target is a file
    const normalized = target.includes("/") ? toPosix(target) : undefined;
    if (normalized) {
      const rel = normalized.startsWith("DesktopApp") ? normalized : `DesktopApp/sm/${normalized}`;

      // IPC handlers affect preload + all callers
      const handlerChannels = this.index.ipcChannels.filter((c) => c.handlerFile === rel);
      for (const ch of handlerChannels) {
        for (const u of ch.usedBy) direct.add(u.split(":")[0]);
        if (ch.preloadMethod) direct.add("DesktopApp/sm/preload.js");
        features.add(ch.handlerFile);
      }

      // If preload changes, all renderer callers affected
      if (rel === "DesktopApp/sm/preload.js") {
        for (const ch of this.index.ipcChannels) {
          for (const u of ch.usedBy) direct.add(u.split(":")[0]);
        }
      }

      // common.js is widely used
      if (rel === "DesktopApp/sm/common.js") {
        indirect.add("DesktopApp/sm/scripts/views/home.js");
        indirect.add("DesktopApp/sm/scripts/index.js");
        for (const f of this.index.files.filter((x) => x.relativePath.endsWith(".js"))) {
          if (f.relativePath.includes("/views/") || f.relativePath.includes("/sections/")) {
            indirect.add(f.relativePath);
          }
        }
      }
    }

    // Target is IPC channel or method
    const ipc = this.index.ipcChannels.find(
      (c) => c.channel.toLowerCase() === q || c.preloadMethod?.toLowerCase() === q
    );
    if (ipc) {
      direct.add(ipc.handlerFile);
      direct.add("DesktopApp/sm/preload.js");
      for (const u of ipc.usedBy) direct.add(u.split(":")[0]);
      for (const f of this.index.features) {
        if (f.ipc.channels.includes(ipc.channel)) features.add(f.name);
      }
    }

    // Target is table
    const table = this.index.dbTables.find((t) => t.name === q);
    if (table) {
      for (const h of table.usedByHandlers) direct.add(h);
      for (const f of this.index.features) {
        if (f.data.tables.includes(table.name)) features.add(f.name);
      }
    }

    // Target is feature id
    const feature = this.index.features.find((f) => f.id === q || f.name.toLowerCase().includes(q));
    if (feature) {
      for (const f of this.collectFeatureFiles(feature)) direct.add(f);
      for (const f of this.collectRelatedFiles(feature)) indirect.add(f);
      features.add(feature.name);
    }

    const directArr = [...direct].sort();
    const indirectArr = [...indirect].filter((f) => !direct.has(f)).sort();

    return {
      target,
      directDependents: directArr,
      indirectDependents: indirectArr,
      affectedFeatures: [...features],
      summary: `Changing "${target}" may directly affect ${directArr.length} file(s) and indirectly affect ${indirectArr.length} more across ${features.size} feature domain(s).`,
    };
  }

  getFileSnippet(relativePath: string, query?: string, maxLines = 60): string {
    const rel = relativePath.includes("DesktopApp") ? toPosix(relativePath) : `DesktopApp/sm/${relativePath}`;
    const file = this.index.files.find((f) => f.relativePath === rel);
    if (!file) return `File not indexed: ${rel}`;

    const content = readTextSafe(file.path, 400_000);
    const lines = content.split("\n");

    if (!query) {
      const head = lines.slice(0, maxLines).join("\n");
      return `# ${rel} (first ${Math.min(maxLines, lines.length)} of ${lines.length} lines)\n\n${head}${lines.length > maxLines ? "\n\n... truncated ..." : ""}`;
    }

    const q = query.toLowerCase();
    const matchLine = lines.findIndex((l) => l.toLowerCase().includes(q));
    if (matchLine < 0) return `Query "${query}" not found in ${rel}`;

    const start = Math.max(0, matchLine - 15);
    const end = Math.min(lines.length, matchLine + 45);
    const snippet = lines
      .slice(start, end)
      .map((l, i) => `${start + i + 1}| ${l}`)
      .join("\n");

    return `# ${rel} (around line ${matchLine + 1}, match: "${query}")\n\n${snippet}`;
  }

  listFeatures(): string {
    return this.index.features
      .map((f) => `- **${f.name}** (\`${f.id}\`): handler=${f.ipc.handler ?? "n/a"}, tables=[${f.data.tables.join(", ")}]`)
      .join("\n");
  }

  private collectFeatureFiles(f: FeatureDomain): string[] {
    const files: string[] = [];
    const add = (p?: string) => { if (p) files.push(p); };
    add(f.ui.view);
    add(f.ui.viewScript);
    add(f.ui.section);
    add(f.ui.sectionScript);
    files.push(...f.ui.popups, ...f.ui.popupScripts);
    add(f.ipc.handler);
    files.push("DesktopApp/sm/preload.js");
    return [...new Set(files)];
  }

  private collectRelatedFiles(f: FeatureDomain): string[] {
    const related = new Set<string>(f.sharedUtilities);

    if (f.id === "home" || f.id === "diagnosis") {
      related.add("DesktopApp/sm/scripts/sections/diagnosis-section.js");
      related.add("DesktopApp/sm/scripts/views/popup/edit-create-template.js");
    }

    for (const ch of this.index.ipcChannels.filter((c) => f.ipc.channels.includes(c.channel))) {
      for (const u of ch.usedBy) related.add(u.split(":")[0]);
    }

    for (const key of f.data.localStorageKeys) {
      const ls = this.index.localStorageKeys.find((k) => k.key === key);
      if (ls) for (const u of ls.usedBy) related.add(u.split(":")[0]);
    }

    return [...related];
  }

  private describeDataFlow(f: FeatureDomain): string {
    const lines: string[] = [`# Data Flow: ${f.name}\n`];

    if (f.ui.sectionScript || f.ui.viewScript) {
      lines.push("1. **UI (Renderer)**");
      if (f.ui.view) lines.push(`   - Page: ${f.ui.view}`);
      if (f.ui.section) lines.push(`   - Prescription section: ${f.ui.section}`);
      lines.push(`   - Calls \`window.electronAPI.${f.ipc.preloadMethods[0] ?? "..."}()\``);
    }

    lines.push("\n2. **IPC Bridge**");
    lines.push("   - `DesktopApp/sm/preload.js` maps electronAPI methods → ipcRenderer.invoke channels");

    lines.push("\n3. **Handler (Main Process)**");
    if (f.ipc.handler) lines.push(`   - ${f.ipc.handler}`);
    for (const ch of f.ipc.channels.slice(0, 4)) {
      const ipc = this.index.ipcChannels.find((c) => c.channel === ch);
      if (ipc) {
        lines.push(`   - \`${ch}\` (${ipc.operation}) → tables: ${ipc.tables.join(", ") || "none"}`);
      }
    }

    if (f.data.tables.length) {
      lines.push("\n4. **SQLite (preData.db)**");
      for (const t of f.data.tables) lines.push(`   - Table \`${t}\``);
    }

    if (f.data.localStorageKeys.length) {
      lines.push("\n4. **localStorage (patient/session data)**");
      for (const k of f.data.localStorageKeys) {
        const meta = this.index.localStorageKeys.find((x) => x.key === k);
        lines.push(`   - \`${k}\`${meta?.purpose ? `: ${meta.purpose}` : ""}`);
      }
    }

    lines.push("\n5. **Shared utilities**");
    lines.push(`   - common.js (formatting, row templates, settings cache)`);

    return lines.join("\n");
  }
}

export function formatAnalysisResult(result: FeatureAnalysisResult): string {
  const parts = [
    `# Feature Analysis: "${result.query}"\n`,
    result.implementationPath,
    "\n## Likely files to modify",
    ...result.likelyFilesToModify.map((f) => `- ${f}`),
    "\n## Related files (may be affected)",
    ...result.relatedFiles.slice(0, 20).map((f) => `- ${f}`),
  ];

  if (result.dataFlow) {
    parts.push("\n## Data flow\n", result.dataFlow);
  }

  return parts.join("\n");
}

export function formatImpactResult(result: ImpactResult): string {
  return `# Change Impact: ${result.target}

${result.summary}

## Direct dependents (${result.directDependents.length})
${result.directDependents.map((f) => `- ${f}`).join("\n") || "- none identified"}

## Indirect dependents (${result.indirectDependents.length})
${result.indirectDependents.slice(0, 25).map((f) => `- ${f}`).join("\n") || "- none identified"}

## Affected feature domains
${result.affectedFeatures.map((f) => `- ${f}`).join("\n") || "- none identified"}`;
}
