#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { DbService, formatJson, formatQueryResult } from "./db.js";
import { SqlGuardError } from "./sql-guard.js";

function toolError(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const db = new DbService(config);

  const server = new McpServer({
    name: "smartprescription-database",
    version: "1.0.0",
  });

  server.tool(
    "get_database_info",
    "Get SQLite database path, read-only mode, and row limit settings.",
    {},
    async () => ({
      content: [{ type: "text", text: formatJson(db.getInfo()) }],
    })
  );

  server.tool(
    "list_tables",
    "List all user tables in preData.db with approximate row counts.",
    {},
    async () => {
      try {
        const tables = db.listTables();
        const text = tables.map((t) => `- **${t.name}** (${t.rowCount} rows)`).join("\n");
        return {
          content: [{ type: "text", text: `# Tables (${tables.length})\n\n${text || "No tables found."}` }],
        };
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.tool(
    "describe_table",
    "Show columns, indexes, foreign keys, and CREATE TABLE SQL for a table.",
    {
      table: z.string().describe("Table name, e.g. 'medicine' or 'chief_complaints'"),
    },
    async ({ table }) => {
      try {
        return { content: [{ type: "text", text: formatJson(db.describeTable(table)) }] };
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.tool(
    "get_table_data",
    "Read rows from a table with pagination. Safe read-only helper.",
    {
      table: z.string().describe("Table name"),
      limit: z.number().int().min(1).max(500).optional().describe("Max rows (default 50)"),
      offset: z.number().int().min(0).optional().describe("Row offset (default 0)"),
    },
    async ({ table, limit, offset }) => {
      try {
        const result = db.getTableData(table, limit ?? 50, offset ?? 0);
        const meta = `# ${table} (showing ${result.rowCount} rows, offset ${offset ?? 0})\n\n`;
        return { content: [{ type: "text", text: meta + formatQueryResult(result) }] };
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.tool(
    "query_sql",
    "Run a read-only SQL query (SELECT / WITH / EXPLAIN). Params supported via ? placeholders.",
    {
      sql: z.string().describe("Read-only SQL statement"),
      params: z.array(z.union([z.string(), z.number(), z.null(), z.boolean()])).optional().describe("Optional bound parameters"),
    },
    async ({ sql, params }) => {
      try {
        const result = db.querySql(sql, params ?? []);
        const header = `# Query result (${result.rowCount} rows)\n\n`;
        return {
          content: [
            {
              type: "text",
              text: header + (result.rows.length ? formatQueryResult(result) : "No rows returned."),
            },
          ],
        };
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.tool(
    "execute_sql",
    "Run a write/DDL SQL statement (CREATE, ALTER, INSERT, UPDATE, DELETE). Requires confirmWrite: true. Destructive ops need allowDestructive: true.",
    {
      sql: z.string().describe("Write or DDL SQL statement"),
      params: z.array(z.union([z.string(), z.number(), z.null(), z.boolean()])).optional().describe("Optional bound parameters"),
      confirmWrite: z.boolean().describe("Must be true to execute any write/DDL statement"),
      allowDestructive: z
        .boolean()
        .optional()
        .describe("Set true to allow DROP, TRUNCATE, or DELETE without WHERE"),
    },
    async ({ sql, params, confirmWrite, allowDestructive }) => {
      try {
        const result = db.executeSql(sql, params ?? [], {
          confirmWrite,
          allowDestructive: allowDestructive ?? false,
        });
        return {
          content: [
            {
              type: "text",
              text: `SQL executed successfully.\n\n${formatJson(result)}`,
            },
          ],
        };
      } catch (err) {
        if (err instanceof SqlGuardError) {
          return toolError(err.message);
        }
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`SmartPrescription database MCP running (${config.dbPath})`);

  process.on("SIGINT", () => {
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
