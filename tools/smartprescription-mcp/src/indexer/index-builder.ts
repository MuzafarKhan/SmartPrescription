import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type {
  ArchitectureSummary,
  CodeIndex,
  DbTable,
  FeatureDomain,
  FileMeta,
  IpcChannel,
  LocalStorageKey,
  RouteEntry,
} from "../types.js";
import {
  classifyFile,
  getAppRoot,
  inferDomain,
  readTextSafe,
  resolveProjectRoot,
  shouldIndex,
  toPosix,
} from "./utils.js";
import {
  LOCAL_STORAGE_PURPOSES,
  parseElectronApiUsage,
  parseFunctions,
  parseHandler,
  parseLocalStorageUsage,
  parsePreload,
  parseRoutes,
  type PreloadMapping,
} from "./parsers.js";

const INDEX_VERSION = 1;

const DOMAIN_DEFINITIONS: Omit<FeatureDomain, "ipc" | "ui" | "data" | "sharedUtilities">[] = [
  {
    id: "chief-complaint",
    name: "Chief Complaint",
    keywords: ["chief complaint", "complaint", "chief-complaint", "chief_complaints"],
  },
  {
    id: "diagnosis",
    name: "Diagnosis",
    keywords: ["diagnosis", "template", "attach medicine", "attach patient instruction", "diagnosis_medicine"],
  },
  {
    id: "investigation",
    name: "Investigation",
    keywords: ["investigation", "lab", "test"],
  },
  {
    id: "plan",
    name: "Plan",
    keywords: ["plan", "treatment plan"],
  },
  {
    id: "medicine",
    name: "Medicine",
    keywords: ["medicine", "medication", "drug", "prescription medicine"],
  },
  {
    id: "patient-instruction",
    name: "Patient Instruction",
    keywords: ["patient instruction", "instruction", "advice"],
  },
  {
    id: "rehabilitation-aids",
    name: "Rehabilitation Aids",
    keywords: ["rehabilitation", "aids", "rehab"],
  },
  {
    id: "settings",
    name: "Settings",
    keywords: ["settings", "translation", "printer", "default date", "default day"],
  },
  {
    id: "pending-patients",
    name: "Pending Patients",
    keywords: ["pending patients", "patient queue", "allPatients"],
  },
  {
    id: "home",
    name: "Prescription Form (Home)",
    keywords: ["prescription", "home", "patient form", "save patient"],
  },
  {
    id: "print",
    name: "Print",
    keywords: ["print", "printer", "thermal"],
  },
];

export class IndexBuilder {
  private projectRoot: string;
  private appRoot: string;
  private cachePath: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot ?? resolveProjectRoot();
    this.appRoot = getAppRoot(this.projectRoot);
    const mcpRoot = path.resolve(import.meta.dirname, "../..");
    this.cachePath = path.join(mcpRoot, ".cache/index.json");
  }

  getCachePath(): string {
    return this.cachePath;
  }

  async build(force = false): Promise<CodeIndex> {
    if (!force && fs.existsSync(this.cachePath)) {
      const existing = JSON.parse(fs.readFileSync(this.cachePath, "utf8")) as CodeIndex;
      const needsUpdate = await this.needsIncrementalUpdate(existing);
      if (!needsUpdate) return existing;
      return this.buildIndex(existing.fileFingerprints);
    }
    return this.buildIndex({});
  }

  private async needsIncrementalUpdate(existing: CodeIndex): Promise<boolean> {
    const files = await this.collectFiles();
    if (files.length !== existing.files.length) return true;

    for (const f of files) {
      const rel = toPosix(path.relative(this.projectRoot, f));
      const stat = fs.statSync(f);
      if (existing.fileFingerprints[rel] !== stat.mtimeMs) return true;
    }
    return false;
  }

  private async collectFiles(): Promise<string[]> {
    const patterns = [
      "DesktopApp/sm/**/*.js",
      "DesktopApp/sm/**/*.html",
      "DesktopApp/sm/preData.db",
      "DesktopApp/sm/main.js",
      "DesktopApp/sm/preload.js",
      "DesktopApp/sm/common.js",
      "DesktopApp/sm/package.json",
    ];

    return fg(patterns, {
      cwd: this.projectRoot,
      absolute: true,
      ignore: ["**/node_modules/**", "**/libraries/**", "**/otherlibraries/**"],
    });
  }

  private async buildIndex(
    previousFingerprints: Record<string, number>
  ): Promise<CodeIndex> {
    const absFiles = await this.collectFiles();
    const fileMetas: FileMeta[] = [];
    const fingerprints: Record<string, number> = { ...previousFingerprints };

    const preloadPath = path.join(this.appRoot, "preload.js");
    const preloadContent = readTextSafe(preloadPath);
    const preloadMappings = parsePreload(preloadContent);
    const preloadByChannel = new Map(preloadMappings.map((m) => [m.channel, m.method]));

    const allElectronUsage = new Map<string, string[]>();
    const allLocalStorageUsage = new Map<string, string[]>();
    const handlerChannels: { file: string; channels: ReturnType<typeof parseHandler> }[] = [];
    const allFunctions: { file: string; name: string; line: number }[] = [];
    let routes: RouteEntry[] = [];

    for (const absPath of absFiles) {
      const rel = toPosix(path.relative(this.projectRoot, absPath));
      if (!shouldIndex(rel)) continue;

      const stat = fs.statSync(absPath);
      fingerprints[rel] = stat.mtimeMs;

      fileMetas.push({
        path: absPath,
        relativePath: rel,
        role: classifyFile(rel),
        domain: inferDomain(rel),
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      });

      if (!rel.endsWith(".js")) continue;
      const content = readTextSafe(absPath);

      if (rel.includes("/handlers/")) {
        handlerChannels.push({ file: rel, channels: parseHandler(content) });
      }

      if (rel.endsWith("scripts/index.js")) {
        routes = parseRoutes(content).map((r) => ({
          page: r.page,
          viewHtml: r.viewHtml,
          viewScript: r.viewHtml.replace("/views/", "/scripts/views/").replace(".html", ".js"),
        }));
      }

      for (const [method, locs] of parseElectronApiUsage(content, rel)) {
        const existing = allElectronUsage.get(method) ?? [];
        allElectronUsage.set(method, [...existing, ...locs]);
      }

      for (const [key, locs] of parseLocalStorageUsage(content, rel)) {
        const existing = allLocalStorageUsage.get(key) ?? [];
        allLocalStorageUsage.set(key, [...existing, ...locs]);
      }

      for (const fn of parseFunctions(content, rel)) {
        allFunctions.push({ file: rel, ...fn });
      }
    }

    const ipcChannels = this.buildIpcIndex(handlerChannels, preloadMappings, allElectronUsage);
    const dbTables = this.buildDbIndex(handlerChannels, ipcChannels);
    const localStorageKeys = this.buildLocalStorageIndex(allLocalStorageUsage);
    const features = this.buildFeatureDomains(fileMetas, ipcChannels, dbTables, localStorageKeys, routes);

    const index: CodeIndex = {
      version: INDEX_VERSION,
      projectRoot: this.projectRoot,
      appRoot: toPosix(path.relative(this.projectRoot, this.appRoot)),
      builtAt: new Date().toISOString(),
      architecture: this.buildArchitectureSummary(),
      files: fileMetas.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
      ipcChannels,
      dbTables,
      localStorageKeys,
      features,
      routes,
      fileFingerprints: fingerprints,
    };

    fs.mkdirSync(path.dirname(this.cachePath), { recursive: true });
    fs.writeFileSync(this.cachePath, JSON.stringify(index, null, 2));

    return index;
  }

  private buildArchitectureSummary(): ArchitectureSummary {
    return {
      type: "Electron desktop application (offline, monolithic)",
      stack: ["Electron 33", "Node.js", "jQuery", "Bootstrap", "SQLite3", "JavaScript (CommonJS)"],
      frontend: "HTML fragments in DesktopApp/sm/views + sections, jQuery.load() routing in scripts/index.js",
      backend: "Electron main process handlers in DesktopApp/sm/handlers/*.js (no HTTP/REST API)",
      database: "SQLite preData.db via raw sqlite3 queries (master/reference data only)",
      patientData: "Browser localStorage (allPatients, surgery templates) — not persisted to SQLite",
      communication: "Renderer → preload.js (contextBridge) → ipcRenderer.invoke → ipcMain.handle in handlers",
    };
  }

  private buildIpcIndex(
    handlerChannels: { file: string; channels: ReturnType<typeof parseHandler> }[],
    preloadMappings: PreloadMapping[],
    electronUsage: Map<string, string[]>
  ): IpcChannel[] {
    const methodByChannel = new Map(preloadMappings.map((m) => [m.channel, m.method]));
    const channels: IpcChannel[] = [];

    for (const { file, channels: chs } of handlerChannels) {
      for (const ch of chs) {
        const preloadMethod = methodByChannel.get(ch.channel);
        const usedBy = preloadMethod && electronUsage.has(preloadMethod)
          ? electronUsage.get(preloadMethod)!
          : [];

        channels.push({
          channel: ch.channel,
          handlerFile: file,
          preloadMethod,
          operation: ch.operation,
          tables: ch.tables,
          usedBy,
        });
      }
    }

    // print-content is in main.js, not handlers
    channels.push({
      channel: "print-content",
      handlerFile: "DesktopApp/sm/main.js",
      preloadMethod: "print",
      operation: "print",
      tables: [],
      usedBy: electronUsage.get("print") ?? [],
    });

    return channels.sort((a, b) => a.channel.localeCompare(b.channel));
  }

  private buildDbIndex(
    handlerChannels: { file: string; channels: ReturnType<typeof parseHandler> }[],
    ipcChannels: IpcChannel[]
  ): DbTable[] {
    const tableMap = new Map<string, DbTable>();

    for (const { file, channels } of handlerChannels) {
      for (const ch of channels) {
        for (const table of ch.tables) {
          let entry = tableMap.get(table);
          if (!entry) {
            entry = { name: table, columns: [], usedByHandlers: [], usedByChannels: [] };
            tableMap.set(table, entry);
          }
          if (!entry.usedByHandlers.includes(file)) entry.usedByHandlers.push(file);
          if (!entry.usedByChannels.includes(ch.channel)) entry.usedByChannels.push(ch.channel);
        }
      }
    }

    for (const ipc of ipcChannels) {
      for (const table of ipc.tables) {
        let entry = tableMap.get(table);
        if (!entry) {
          entry = { name: table, columns: [], usedByHandlers: [], usedByChannels: [] };
          tableMap.set(table, entry);
        }
        if (!entry.usedByChannels.includes(ipc.channel)) entry.usedByChannels.push(ipc.channel);
        if (!entry.usedByHandlers.includes(ipc.handlerFile)) entry.usedByHandlers.push(ipc.handlerFile);
      }
    }

    return [...tableMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private buildLocalStorageIndex(usage: Map<string, string[]>): LocalStorageKey[] {
    return [...usage.entries()]
      .map(([key, usedBy]) => ({
        key,
        usedBy,
        purpose: LOCAL_STORAGE_PURPOSES[key],
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  private buildFeatureDomains(
    files: FileMeta[],
    ipcChannels: IpcChannel[],
    dbTables: DbTable[],
    localStorageKeys: LocalStorageKey[],
    routes: RouteEntry[]
  ): FeatureDomain[] {
    return DOMAIN_DEFINITIONS.map((def) => {
      const slug = def.id;
      const findFile = (pattern: RegExp) =>
        files.find((f) => pattern.test(f.relativePath))?.relativePath;

      const handler = findFile(new RegExp(`/handlers/${slug.replace(/-/g, "[-_]")}-handler\\.js`))
        ?? findFile(new RegExp(`/handlers/${slug.replace(/-/g, "[-_]")}\\.js`))
        ?? (slug === "settings" ? findFile(/setting-handler\.js/) : undefined)
        ?? (slug === "print" ? "DesktopApp/sm/main.js" : undefined);

      const domainChannels = ipcChannels.filter((c) => {
        if (handler && c.handlerFile === handler) return true;
        return c.channel.includes(slug.replace(/-/g, "-")) ||
          (slug === "settings" && (c.channel.includes("settings") || c.channel.includes("translation") || c.channel.includes("print-direct"))) ||
          (slug === "print" && c.channel.includes("print"));
      });

      const domainTables = dbTables.filter((t) =>
        t.usedByHandlers.some((h) => h === handler) ||
        t.name.includes(slug.replace(/-/g, "_"))
      );

      const domainLsKeys = localStorageKeys.filter((k) =>
        k.usedBy.some((u) => u.includes(slug)) ||
        def.keywords.some((kw) => k.key.toLowerCase().includes(kw.toLowerCase().replace(/\s/g, "")))
      );

      const route = routes.find((r) => r.page === slug);

      const popups = files
        .filter((f) => f.role === "popup-html" && f.domain === slug)
        .map((f) => f.relativePath);

      const popupScripts = files
        .filter((f) => f.role === "popup-js" && f.domain === slug)
        .map((f) => f.relativePath);

      const sharedUtilities = ["DesktopApp/sm/common.js"];
      if (slug === "home" || slug === "pending-patients") {
        sharedUtilities.push("DesktopApp/sm/scripts/index.js");
      }

      return {
        ...def,
        ui: {
          view: route?.viewHtml ?? findFile(new RegExp(`/views/${slug}\\.html`)),
          viewScript: route?.viewScript ?? findFile(new RegExp(`/scripts/views/${slug}\\.js`)),
          section: findFile(new RegExp(`/sections/${slug}-section\\.html`)),
          sectionScript: findFile(new RegExp(`/scripts/sections/${slug}-section\\.js`)),
          popups,
          popupScripts,
        },
        ipc: {
          handler,
          channels: domainChannels.map((c) => c.channel),
          preloadMethods: domainChannels.map((c) => c.preloadMethod).filter(Boolean) as string[],
        },
        data: {
          tables: domainTables.map((t) => t.name),
          localStorageKeys: domainLsKeys.map((k) => k.key),
        },
        sharedUtilities,
      };
    });
  }
}

export function formatFeatureTree(feature: FeatureDomain): string {
  const lines: string[] = [`${feature.name} Feature`, "│"];

  lines.push("├── Frontend (Renderer)");
  if (feature.ui.view) lines.push(`│   ├── View: ${feature.ui.view}`);
  if (feature.ui.viewScript) lines.push(`│   ├── View script: ${feature.ui.viewScript}`);
  if (feature.ui.section) lines.push(`│   ├── Section: ${feature.ui.section}`);
  if (feature.ui.sectionScript) lines.push(`│   ├── Section script: ${feature.ui.sectionScript}`);
  for (const p of feature.ui.popups) lines.push(`│   ├── Popup: ${p}`);
  for (const p of feature.ui.popupScripts) lines.push(`│   ├── Popup script: ${p}`);
  lines.push(`│   └── IPC client: preload.js → electronAPI.{${feature.ipc.preloadMethods.slice(0, 3).join(", ")}${feature.ipc.preloadMethods.length > 3 ? ", ..." : ""}}`);

  lines.push("│");
  lines.push("├── Backend (Main Process / IPC Handlers)");
  if (feature.ipc.handler) lines.push(`│   ├── Handler: ${feature.ipc.handler}`);
  for (const ch of feature.ipc.channels.slice(0, 6)) lines.push(`│   ├── IPC: ${ch}`);
  if (feature.ipc.channels.length > 6) lines.push(`│   └── ... +${feature.ipc.channels.length - 6} more channels`);
  else if (feature.ipc.channels.length === 0) lines.push("│   └── (no dedicated IPC — may use shared handlers)");

  lines.push("│");
  lines.push("└── Data");
  if (feature.data.tables.length) {
    for (const t of feature.data.tables) lines.push(`    ├── SQLite table: ${t}`);
  }
  if (feature.data.localStorageKeys.length) {
    for (const k of feature.data.localStorageKeys) lines.push(`    ├── localStorage: ${k}`);
  }
  if (!feature.data.tables.length && !feature.data.localStorageKeys.length) {
    lines.push("    └── (check common.js for shared state)");
  }

  return lines.join("\n");
}
