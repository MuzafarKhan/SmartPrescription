#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { IndexBuilder } from "./indexer/index-builder.js";
import {
  QueryEngine,
  formatAnalysisResult,
  formatImpactResult,
} from "./query-engine.js";

const FORCE_REINDEX = process.argv.includes("--reindex-only") || process.argv.includes("--force-reindex");

async function main(): Promise<void> {
  const builder = new IndexBuilder();
  const index = await builder.build(FORCE_REINDEX);

  if (process.argv.includes("--reindex-only")) {
    console.error(`Index rebuilt at ${builder.getCachePath()} (${index.files.length} files)`);
    process.exit(0);
  }

  const engine = new QueryEngine(index);
  const server = new McpServer({
    name: "smartprescription-codebase",
    version: "1.0.0",
  });

  server.tool(
    "get_project_overview",
    "Get a concise architecture overview of SmartPrescription: stack, layers, entry points, feature domains, IPC count, and database tables. Use this first when exploring the codebase.",
    {},
    async () => ({
      content: [{ type: "text", text: engine.getOverview() }],
    })
  );

  server.tool(
    "get_project_structure",
    "Get indexed project structure grouped by file role (frontend views, handlers, sections, etc.). Optionally filter by layer: frontend, backend, database, shared.",
    {
      layer: z
        .enum(["frontend", "backend", "database", "shared"])
        .optional()
        .describe("Filter structure to a specific layer"),
    },
    async ({ layer }) => ({
      content: [{ type: "text", text: engine.getStructure(layer) }],
    })
  );

  server.tool(
    "list_features",
    "List all discovered feature domains with their handler files and database tables.",
    {},
    async () => ({
      content: [{ type: "text", text: engine.listFeatures() }],
    })
  );

  server.tool(
    "get_feature_map",
    "Get a structured feature map (UI → IPC → handler → database/localStorage) for a feature domain id or name.",
    {
      feature: z
        .string()
        .describe("Feature id or name, e.g. 'medicine', 'chief-complaint', 'pending-patients'"),
    },
    async ({ feature }) => {
      const result = engine.analyzeFeature(feature);
      const primary = result.matchedFeatures[0];
      const text = primary
        ? formatAnalysisResult({ ...result, matchedFeatures: [primary] })
        : `No feature found for "${feature}".\n\nAvailable features:\n${engine.listFeatures()}`;
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "analyze_feature",
    "Given a natural-language feature request, find the most relevant files, implementation path, data flow, and related dependencies. Ideal for scoping a change before reading source files.",
    {
      query: z
        .string()
        .describe("Natural language description, e.g. 'add pagination to medicine list' or 'patient history'"),
    },
    async ({ query }) => ({
      content: [{ type: "text", text: formatAnalysisResult(engine.analyzeFeature(query)) }],
    })
  );

  server.tool(
    "trace_data_flow",
    "Trace how data flows for a feature: UI → preload/electronAPI → IPC handler → SQLite tables or localStorage.",
    {
      feature: z.string().describe("Feature id or name, e.g. 'diagnosis', 'settings', 'print'"),
    },
    async ({ feature }) => ({
      content: [{ type: "text", text: engine.traceDataFlow(feature) }],
    })
  );

  server.tool(
    "search_symbols",
    "Search for JavaScript functions and symbol names across indexed source files.",
    {
      query: z.string().describe("Symbol or function name to search for"),
      limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)"),
    },
    async ({ query, limit }) => {
      const results = engine.searchSymbols(query, limit ?? 20);
      if (!results.length) {
        return { content: [{ type: "text", text: `No symbols matching "${query}".` }] };
      }
      const text = results
        .map((r) => `- **${r.name}** (${r.kind}) — ${r.file}${r.line ? `:${r.line}` : ""}${r.snippet ? `\n  ${r.snippet}` : ""}`)
        .join("\n");
      return { content: [{ type: "text", text: `# Symbol search: "${query}"\n\n${text}` }] };
    }
  );

  server.tool(
    "search_ipc",
    "Search Electron IPC channels by channel name, preload method, or handler file.",
    {
      query: z.string().describe("IPC channel, preload method, or handler keyword"),
    },
    async ({ query }) => ({
      content: [{ type: "text", text: `# IPC search: "${query}"\n\n${engine.searchIpc(query)}` }],
    })
  );

  server.tool(
    "search_database",
    "Search SQLite tables and find which IPC handlers/channels use them.",
    {
      query: z.string().describe("Table name or keyword, e.g. 'medicine', 'diagnosis_medicine'"),
    },
    async ({ query }) => ({
      content: [{ type: "text", text: `# Database search: "${query}"\n\n${engine.searchDatabase(query)}` }],
    })
  );

  server.tool(
    "find_references",
    "Find references to a file, IPC channel, preload method, database table, or localStorage key.",
    {
      target: z.string().describe("Reference target to look up"),
    },
    async ({ target }) => ({
      content: [{ type: "text", text: engine.findReferences(target) }],
    })
  );

  server.tool(
    "get_change_impact",
    "Identify files and feature domains potentially affected by changing a file, IPC channel, table, or feature.",
    {
      target: z
        .string()
        .describe("File path, IPC channel, preload method, table name, or feature id"),
    },
    async ({ target }) => ({
      content: [{ type: "text", text: formatImpactResult(engine.getChangeImpact(target)) }],
    })
  );

  server.tool(
    "get_file_snippet",
    "Read a targeted snippet from a source file instead of the whole file. Reduces token usage for large files like common.js.",
    {
      path: z.string().describe("Relative path, e.g. 'handlers/medicine-handler.js' or full 'DesktopApp/sm/preload.js'"),
      query: z
        .string()
        .optional()
        .describe("Optional text to locate within the file; returns surrounding lines"),
      maxLines: z
        .number()
        .int()
        .min(10)
        .max(200)
        .optional()
        .describe("Max lines when no query is provided (default 60)"),
    },
    async ({ path: filePath, query, maxLines }) => ({
      content: [{ type: "text", text: engine.getFileSnippet(filePath, query, maxLines) }],
    })
  );

  server.tool(
    "reindex",
    "Rebuild the local codebase index. Use after significant file changes. Incremental updates happen automatically on startup.",
    {},
    async () => {
      const fresh = await builder.build(true);
      const refreshed = new QueryEngine(fresh);
      return {
        content: [
          {
            type: "text",
            text: `Index rebuilt successfully.\n- Files: ${fresh.files.length}\n- IPC channels: ${fresh.ipcChannels.length}\n- Tables: ${fresh.dbTables.length}\n- Features: ${fresh.features.length}\n- Cache: ${builder.getCachePath()}\n\n${refreshed.getOverview()}`,
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SmartPrescription codebase MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
