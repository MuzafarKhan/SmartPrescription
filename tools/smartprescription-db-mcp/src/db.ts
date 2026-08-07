import Database from "better-sqlite3";
import type { DbConfig } from "./config.js";
import {
  assertReadQuery,
  assertWriteAllowed,
  quoteIdentifier,
  SqlGuardError,
} from "./sql-guard.js";

export interface TableInfo {
  name: string;
  rowCount: number;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  defaultValue: string | null;
  pk: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface ExecuteResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export class DbService {
  private db: Database.Database;
  private config: DbConfig;

  constructor(config: DbConfig) {
    this.config = config;
    this.db = new Database(config.dbPath, {
      readonly: config.readOnly,
      fileMustExist: true,
    });
    this.db.pragma("foreign_keys = ON");
  }

  getInfo(): { path: string; readOnly: boolean; maxRows: number } {
    return {
      path: this.config.dbPath,
      readOnly: this.config.readOnly,
      maxRows: this.config.maxRows,
    };
  }

  listTables(): TableInfo[] {
    const rows = this.db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`
      )
      .all() as { name: string }[];

    return rows.map((row) => {
      const countRow = this.db
        .prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(row.name)}`)
        .get() as { count: number };
      return { name: row.name, rowCount: countRow.count };
    });
  }

  describeTable(table: string): {
    table: string;
    columns: ColumnInfo[];
    indexes: { name: string; unique: number; sql: string | null }[];
    foreignKeys: {
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      onUpdate: string;
      onDelete: string;
    }[];
    createSql: string | null;
  } {
    const tableName = table.trim();
    const exists = this.db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(tableName) as { name: string } | undefined;

    if (!exists) {
      throw new SqlGuardError(`Table not found: ${tableName}`);
    }

    const columns = this.db.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all() as ColumnInfo[];
    const indexes = this.db.prepare(`PRAGMA index_list(${quoteIdentifier(tableName)})`).all() as {
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }[];
    const foreignKeys = this.db.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(tableName)})`).all() as {
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      on_update: string;
      on_delete: string;
    }[];
    const createRow = this.db
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(tableName) as { sql: string | null } | undefined;

    return {
      table: tableName,
      columns,
      indexes: indexes.map((idx) => {
        const sqlRow = this.db
          .prepare(`SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?`)
          .get(idx.name) as { sql: string | null } | undefined;
        return { name: idx.name, unique: idx.unique, sql: sqlRow?.sql ?? null };
      }),
      foreignKeys: foreignKeys.map((fk) => ({
        id: fk.id,
        seq: fk.seq,
        table: fk.table,
        from: fk.from,
        to: fk.to,
        onUpdate: fk.on_update,
        onDelete: fk.on_delete,
      })),
      createSql: createRow?.sql ?? null,
    };
  }

  getTableData(table: string, limit = 50, offset = 0): QueryResult {
    const tableName = table.trim();
    quoteIdentifier(tableName);
    this.describeTable(tableName);

    const safeLimit = Math.min(Math.max(limit, 1), this.config.maxRows);
    const safeOffset = Math.max(offset, 0);

    const sql = `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT ? OFFSET ?`;
    const rows = this.db.prepare(sql).all(safeLimit + 1, safeOffset) as Record<string, unknown>[];

    const truncated = rows.length > safeLimit;
    const resultRows = truncated ? rows.slice(0, safeLimit) : rows;
    const columns = resultRows.length ? Object.keys(resultRows[0]) : this.describeTable(tableName).columns.map((c) => c.name);

    return {
      columns,
      rows: resultRows,
      rowCount: resultRows.length,
      truncated,
    };
  }

  querySql(sql: string, params: unknown[] = []): QueryResult {
    if (this.config.readOnly) {
      assertReadQuery(sql);
    } else {
      assertReadQuery(sql);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    const limited = rows.slice(0, this.config.maxRows);
    const columns = limited.length ? Object.keys(limited[0]) : [];

    return {
      columns,
      rows: limited,
      rowCount: limited.length,
      truncated: rows.length > this.config.maxRows,
    };
  }

  executeSql(
    sql: string,
    params: unknown[] = [],
    options: { confirmWrite: boolean; allowDestructive: boolean }
  ): ExecuteResult {
    if (this.config.readOnly) {
      throw new SqlGuardError("Database is in read-only mode (DB_READ_ONLY=true).");
    }

    assertWriteAllowed(sql, options);

    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);

    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  close(): void {
    this.db.close();
  }
}

export function formatQueryResult(result: QueryResult): string {
  if (!result.rows.length) {
    return "No rows returned.";
  }

  const header = result.columns.join(" | ");
  const divider = result.columns.map(() => "---").join(" | ");
  const body = result.rows
    .map((row) => result.columns.map((col) => stringifyCell(row[col])).join(" | "))
    .join("\n");

  const footer = result.truncated ? `\n\n(Results truncated to max row limit.)` : "";
  return `${header}\n${divider}\n${body}${footer}`;
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}
