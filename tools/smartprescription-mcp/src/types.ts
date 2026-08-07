export interface FileMeta {
  path: string;
  relativePath: string;
  role: FileRole;
  domain?: string;
  size: number;
  mtimeMs: number;
}

export type FileRole =
  | "entry"
  | "preload"
  | "common"
  | "handler"
  | "view-html"
  | "view-js"
  | "section-html"
  | "section-js"
  | "popup-html"
  | "popup-js"
  | "routing"
  | "database"
  | "config"
  | "vendor"
  | "other";

export interface IpcChannel {
  channel: string;
  handlerFile: string;
  preloadMethod?: string;
  operation?: "read" | "write" | "delete" | "print" | "other";
  tables: string[];
  usedBy: string[];
}

export interface DbTable {
  name: string;
  columns: string[];
  usedByHandlers: string[];
  usedByChannels: string[];
}

export interface LocalStorageKey {
  key: string;
  usedBy: string[];
  purpose?: string;
}

export interface FeatureDomain {
  id: string;
  name: string;
  keywords: string[];
  ui: {
    view?: string;
    viewScript?: string;
    section?: string;
    sectionScript?: string;
    popups: string[];
    popupScripts: string[];
  };
  ipc: {
    handler?: string;
    channels: string[];
    preloadMethods: string[];
  };
  data: {
    tables: string[];
    localStorageKeys: string[];
  };
  sharedUtilities: string[];
}

export interface CodeIndex {
  version: number;
  projectRoot: string;
  appRoot: string;
  builtAt: string;
  architecture: ArchitectureSummary;
  files: FileMeta[];
  ipcChannels: IpcChannel[];
  dbTables: DbTable[];
  localStorageKeys: LocalStorageKey[];
  features: FeatureDomain[];
  routes: RouteEntry[];
  fileFingerprints: Record<string, number>;
}

export interface ArchitectureSummary {
  type: string;
  stack: string[];
  frontend: string;
  backend: string;
  database: string;
  patientData: string;
  communication: string;
}

export interface RouteEntry {
  page: string;
  viewHtml: string;
  viewScript?: string;
}

export interface SearchResult {
  kind: string;
  name: string;
  file: string;
  line?: number;
  snippet?: string;
  relevance: number;
}

export interface FeatureAnalysisResult {
  query: string;
  matchedFeatures: FeatureDomain[];
  implementationPath: string;
  likelyFilesToModify: string[];
  relatedFiles: string[];
  dataFlow: string;
}

export interface ImpactResult {
  target: string;
  directDependents: string[];
  indirectDependents: string[];
  affectedFeatures: string[];
  summary: string;
}
